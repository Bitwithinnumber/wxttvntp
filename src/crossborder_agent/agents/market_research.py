"""① 市场调研/选品 Agent：SerpApi 抓取 Amazon 竞品 + LLM 分析。"""

from ..connectors.llm import get_llm
from ..connectors.serpapi_client import search_amazon
from ..models import CompetitorProduct, MarketReport
from ..state import PipelineState


def market_research_node(state: PipelineState) -> dict:
    keyword = state["keyword"]
    marketplace = state.get("marketplace", "amazon.com")
    results = search_amazon(keyword, marketplace)[:15]

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

    llm = get_llm()

    class _Analysis(MarketReport):
        pass

    structured = llm.with_structured_output(_Analysis)
    comp_lines = "\n".join(
        f"- {c.title[:80]} | ${c.price} | 评分{c.rating} | {c.reviews}评论" for c in competitors
    )
    report: MarketReport = structured.invoke(
        f"""你是跨境电商选品分析师。基于以下 {marketplace} 上关键词「{keyword}」的真实竞品数据，
输出选品分析：机会评分 opportunity_score (0-100)、建议价格带 price_low/price_high、
analysis（中文：市场饱和度、竞品痛点、差异化机会、风险）。

竞品数据：
{comp_lines}
"""
    )
    report.keyword = keyword
    report.marketplace = marketplace
    report.competitors = competitors
    if prices and not report.price_low:
        report.price_low, report.price_high = min(prices), max(prices)
    return {"market_report": report}
