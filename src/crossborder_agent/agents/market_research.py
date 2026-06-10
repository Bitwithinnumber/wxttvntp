"""① 市场调研/选品 Agent：ddgs/SerpApi 抓取 Amazon 竞品 + 关键词联想 + LLM 分析。"""

import statistics

from ..config import get_settings
from ..connectors.llm import get_structured_llm
from ..models import CompetitorProduct, MarketReport
from ..state import PipelineState


def _search(keyword: str, marketplace: str) -> list[dict]:
    if get_settings().market_data_provider == "serpapi":
        from ..connectors.serpapi_client import search_amazon

        return search_amazon(keyword, marketplace)
    from ..connectors.ddgs_client import search_amazon_via_ddgs

    return search_amazon_via_ddgs(keyword, marketplace)


def market_research_node(state: PipelineState) -> dict:
    keyword = state["keyword"]
    marketplace = state.get("marketplace", "amazon.com")
    results = _search(keyword, marketplace)[:15]

    try:
        from ..connectors.ddgs_client import get_keyword_suggestions

        suggestions = get_keyword_suggestions(keyword)
    except Exception:
        suggestions = []

    try:
        from ..connectors.ddgs_client import search_review_insights

        reviews = search_review_insights(keyword)
    except Exception:
        reviews = []

    competitors = []
    for r in results:
        price = r.get("extracted_price")
        competitors.append(
            CompetitorProduct(
                asin=r.get("asin", ""),
                title=r.get("title", ""),
                price=price,
                rating=r.get("rating"),
                reviews=r.get("reviews"),
                link=r.get("link", ""),
            )
        )
    prices = [c.price for c in competitors if c.price]

    structured = get_structured_llm(MarketReport)
    comp_lines = "\n".join(
        f"- {c.title[:80]} | ${c.price} | 评分{c.rating} | {c.reviews}评论" for c in competitors
    )
    review_lines = "\n".join(
        f"- {r['title'][:60]}: {r['body'][:160]}" for r in reviews
    ) or "无"
    data_note = (
        f"数据完备度：{len(prices)}/{len(competitors)} 个竞品有价格。"
        "若价格/评分数据不足，评分需保守并在 analysis 中说明数据局限。"
    )
    report: MarketReport = structured.invoke(
        f"""你是跨境电商选品分析师。基于以下 {marketplace} 上关键词「{keyword}」的真实竞品数据、
真实搜索联想词与真实用户评论/讨论摘要，输出选品分析：
- opportunity_score (0-100)：综合竞争烈度、价格空间、痛点可改进性评分
- price_low/price_high：建议切入价格带
- pain_points：3-6 条用户痛点（中文，从评论摘要中提炼，标明依据）
- differentiation：针对痛点的差异化切入建议（中文，具体可执行）
- analysis（中文：市场饱和度、细分需求（结合联想词）、风险）
{data_note}

竞品数据：
{comp_lines}

用户真实搜索联想词（反映细分需求）：{', '.join(suggestions) or '无'}

真实用户评论/讨论摘要（痛点来源）：
{review_lines}
"""
    )
    report.keyword = keyword
    report.marketplace = marketplace
    report.competitors = competitors
    report.keyword_suggestions = suggestions
    if prices:
        if not report.price_low:
            report.price_low, report.price_high = min(prices), max(prices)
        report.price_median = round(statistics.median(prices), 2)
    return {"market_report": report}
