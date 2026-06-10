"""⑥ 内容本地化生成 Agent：多语言标题/五点/描述/搜索词（并行生成 + 按平台标题适配）。"""

from concurrent.futures import ThreadPoolExecutor

from ..connectors.llm import get_structured_llm
from ..models import ContentPack, LocalizedListing
from ..state import PipelineState
from .assembly import PLATFORM_RULES

LANG_NAMES = {"en": "英语", "de": "德语", "fr": "法语", "es": "西班牙语", "ja": "日语"}
SEARCH_TERMS_MAX_BYTES = 250


def _truncate_chars(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut or text[:limit]


def _truncate_bytes(text: str, limit: int) -> str:
    while len(text.encode("utf-8")) > limit:
        text = text.rsplit(" ", 1)[0] if " " in text else text[:-1]
    return text


def content_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    market = state.get("market_report")
    languages = state.get("target_languages", ["en"])
    platforms = state.get("target_platforms", ["amazon"])
    limits = {
        p: PLATFORM_RULES.get(p, PLATFORM_RULES["amazon"])["title_max"] for p in platforms
    }
    base_max = max(limits.values())  # 按最宽平台生成完整标题，再为严格平台压缩适配
    suggest = ", ".join(market.keyword_suggestions[:8]) if market else ""
    pains = "\n".join(f"- {p}" for p in market.pain_points[:6]) if market else ""

    comp_titles = (
        "\n".join(f"- {c.title}" for c in market.competitors[:5]) if market else ""
    )
    structured = get_structured_llm(LocalizedListing, temperature=0.7)

    def _compress_title(lang: str, title: str, limit: int) -> str:
        for _ in range(2):
            if len(title) <= limit:
                return title
            shorter: LocalizedListing = structured.invoke(
                f"把以下{LANG_NAMES.get(lang, lang)}标题压缩到 {limit} 字符以内"
                f"（当前 {len(title)} 字符，含空格标点，必须严格不超过上限），"
                f"保留核心搜索关键词，删修饰词：\n{title}"
            )
            if shorter.title and len(shorter.title) < len(title):
                title = shorter.title
        return _truncate_chars(title, limit)

    def _generate(lang: str) -> LocalizedListing:
        listing: LocalizedListing = structured.invoke(
            f"""你是跨境电商 Listing 文案专家。基于以下中文商品信息，
生成{LANG_NAMES.get(lang, lang)}({lang}) Listing：
- title: 不超过 {base_max} 字符（硬性上限），前 80 字符放核心关键词，
  自然埋入高搜索量词，禁止品牌侵权词
- bullet_points: 5 条卖点（each ≤ 250 字符），突出材质/功能/场景/售后，优先回应下方用户痛点
- description: 1000-1500 字符长描述
- search_terms: 后台搜索词（≤ 250 字节，空格分隔，不重复标题已有词）

中文商品标题：{draft.title_cn}
属性：{draft.attributes}
热卖竞品标题参考（学习关键词，不要抄袭）：
{comp_titles}
真实用户搜索联想词（优先覆盖）：{suggest or '无'}
真实用户痛点（卖点必须针对性回应）：
{pains or '无'}
"""
        )
        listing.title = _compress_title(lang, listing.title, base_max)
        listing.search_terms = _truncate_bytes(listing.search_terms, SEARCH_TERMS_MAX_BYTES)
        listing.title_variants = {}
        for p, limit in limits.items():
            if len(listing.title) > limit:
                listing.title_variants[p] = _compress_title(lang, listing.title, limit)
        listing.language = lang
        return listing

    with ThreadPoolExecutor(max_workers=min(len(languages), 5)) as ex:
        listings = list(ex.map(_generate, languages))
    return {"content_pack": ContentPack(listings=listings)}
