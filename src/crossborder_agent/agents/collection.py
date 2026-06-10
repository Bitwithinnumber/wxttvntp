"""③ 商品采集 Agent：OneBound 拉取 1688 商品详情 → 标准化商品草稿。"""

from ..connectors.onebound_client import get_1688_item
from ..models import ProductDraft, SkuVariant
from ..state import PipelineState


def collection_node(state: PipelineState) -> dict:
    target = state.get("source_url") or state.get("sourcing_report") and (
        state["sourcing_report"].recommended_offer_id
        or (state["sourcing_report"].offers[0].offer_id if state["sourcing_report"].offers else "")
    )
    if not target:
        raise RuntimeError("没有可采集的货源：寻源结果为空且未指定 source_url")

    item = get_1688_item(target)
    skus = []
    sku_data = item.get("skus") or {}
    for s in sku_data.get("sku", []) if isinstance(sku_data, dict) else []:
        skus.append(
            SkuVariant(
                sku_id=str(s.get("sku_id", "")),
                properties=str(s.get("properties_name", "")),
                price_cny=float(s["price"]) if s.get("price") else None,
                stock=int(s["quantity"]) if s.get("quantity") else None,
            )
        )
    images = item.get("item_imgs") or []
    image_urls = [i.get("url", "") for i in images if isinstance(i, dict)] or (
        [item["pic_url"]] if item.get("pic_url") else []
    )
    draft = ProductDraft(
        source_offer_id=str(item.get("num_iid", "")),
        source_link=item.get("detail_url", ""),
        title_cn=item.get("title", ""),
        price_cny=float(item["price"]) if item.get("price") else None,
        min_order=int(item["min_num"]) if item.get("min_num") else None,
        skus=skus,
        images=image_urls,
        attributes={
            str(k): str(v) for k, v in (item.get("props") or {}).items()
        } if isinstance(item.get("props"), dict) else {},
        description_cn=str(item.get("desc", ""))[:5000],
    )
    return {"product_draft": draft}
