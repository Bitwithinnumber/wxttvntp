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
    report: MarketReport = structured.invoke(
        f"""你是跨境电商选品分析师。基于以下 {marketplace} 上关键词「{keyword}」的真实竞品数据与
真实搜索联想词，输出选品分析：机会评分 opportunity_score (0-100)、建议价格带 price_low/price_high、
analysis（中文：市场饱和度、竞品痛点、细分需求（结合联想词）、差异化机会、风险）。

竞品数据：
{comp_lines}

用户真实搜索联想词（反映细分需求）：{', '.join(suggestions) or '无'}
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
