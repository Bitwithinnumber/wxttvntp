"""② 供应商寻源 Agent：OneBound 货源平台（1688/淘宝）搜索 + LLM 评估推荐。"""

from ..connectors.llm import get_structured_llm
from ..connectors.onebound_client import search_source_items
from ..models import SourcingReport, SupplierOffer
from ..state import PipelineState


def sourcing_node(state: PipelineState) -> dict:
    if state.get("source_url"):
        return {
            "sourcing_report": SourcingReport(analysis="用户直接指定货源链接，跳过寻源环节。")
        }
    keyword_cn = state.get("keyword_cn") or state["keyword"]
    items = search_source_items(keyword_cn)[:15]
    offers = [
        SupplierOffer(
            offer_id=str(i.get("num_iid", "")),
            title=i.get("title", ""),
            price_cny=float(i["price"]) if i.get("price") else None,
            seller=i.get("seller_nick", ""),
            link=i.get("detail_url", ""),
            pic_url=i.get("pic_url", ""),
        )
        for i in items
    ]

    structured = get_structured_llm(SourcingReport)
    offer_lines = "\n".join(
        f"- ID:{o.offer_id} | {o.title[:60]} | ¥{o.price_cny} | 卖家:{o.seller}" for o in offers
    )
    report: SourcingReport = structured.invoke(
        f"""你是跨境电商供应链专家。以下是货源平台上「{keyword_cn}」的真实货源搜索结果，
请评估并推荐最适合跨境代发的货源（recommended_offer_id 填货源 ID），
analysis 中文说明推荐理由（价格、可代发性、品质信号）与备选方案。

货源列表：
{offer_lines}
"""
    )
    report.keyword_cn = keyword_cn
    report.offers = offers
    return {"sourcing_report": report}
