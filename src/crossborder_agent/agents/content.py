"""⑥ 内容本地化生成 Agent：多语言标题/五点/描述/搜索词（并行生成）。"""

from concurrent.futures import ThreadPoolExecutor

from ..connectors.llm import get_structured_llm
from ..models import ContentPack, LocalizedListing
from ..state import PipelineState
from .assembly import PLATFORM_RULES

LANG_NAMES = {"en": "英语", "de": "德语", "fr": "法语", "es": "西班牙语", "ja": "日语"}


def content_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    market = state.get("market_report")
    languages = state.get("target_languages", ["en"])
    platforms = state.get("target_platforms", ["amazon"])
    title_max = min(
        PLATFORM_RULES.get(p, PLATFORM_RULES["amazon"])["title_max"] for p in platforms
    )
    suggest = ", ".join(market.keyword_suggestions[:8]) if market else ""

    comp_titles = (
        "\n".join(f"- {c.title}" for c in market.competitors[:5]) if market else ""
    )
    structured = get_structured_llm(LocalizedListing, temperature=0.7)

    def _generate(lang: str) -> LocalizedListing:
        listing: LocalizedListing = structured.invoke(
            f"""你是跨境电商 Listing 文案专家。基于以下中文商品信息，
生成{LANG_NAMES.get(lang, lang)}({lang}) Listing：
- title: 不超过 {title_max} 字符（硬性上限），自然埋入高搜索量关键词，禁止品牌侵权词
- bullet_points: 5 条卖点（each ≤ 250 字符），突出材质/功能/场景/售后
- description: 1000-1500 字符长描述
- search_terms: 后台搜索词（≤ 250 字节，空格分隔，不重复标题已有词）

中文商品标题：{draft.title_cn}
属性：{draft.attributes}
热卖竞品标题参考（学习关键词，不要抄袭）：
{comp_titles}
真实用户搜索联想词（优先覆盖）：{suggest or '无'}
"""
        )
        if len(listing.title) > title_max:
            shorter: LocalizedListing = structured.invoke(
                f"把以下{LANG_NAMES.get(lang, lang)}标题压缩到 {title_max} 字符以内，"
                f"保留核心关键词，其余字段原样保留：\n标题：{listing.title}\n"
                f"卖点：{listing.bullet_points}\n描述：{listing.description}\n"
                f"搜索词：{listing.search_terms}"
            )
            if shorter.title and len(shorter.title) <= title_max:
                listing.title = shorter.title
        listing.language = lang
        return listing

    with ThreadPoolExecutor(max_workers=min(len(languages), 5)) as ex:
        listings = list(ex.map(_generate, languages))
    return {"content_pack": ContentPack(listings=listings)}
