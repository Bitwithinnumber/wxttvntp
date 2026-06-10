"""③ 商品采集 Agent：OneBound 拉取货源商品详情 → 标准化商品草稿。"""

import re

from ..connectors.onebound_client import get_source_item
from ..models import ProductDraft, SkuVariant
from ..state import PipelineState

_WEIGHT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克)", re.IGNORECASE)
_SIZE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*[*x×]\s*\d+(?:\.\d+)?(?:\s*[*x×]\s*\d+(?:\.\d+)?)?\s*(?:cm|厘米|mm)?",
    re.IGNORECASE,
)


def _extract_weight_size(attrs: dict[str, str]) -> tuple[float | None, str]:
    """从商品属性中提取重量(kg)与包装尺寸，用于物流成本估算。"""
    weight_kg, size = None, ""
    for k, v in attrs.items():
        text = f"{k} {v}"
        if weight_kg is None and any(w in k for w in ("重", "weight", "Weight")):
            m = _WEIGHT_RE.search(text)
            if m:
                val = float(m.group(1))
                weight_kg = val / 1000 if m.group(2).lower() in ("g", "克") else val
        if not size and any(s in k for s in ("尺寸", "规格", "大小", "size", "Size")):
            m = _SIZE_RE.search(v)
            if m:
                size = m.group(0)
    return weight_kg, size


def collection_node(state: PipelineState) -> dict:
    target = state.get("source_url") or state.get("sourcing_report") and (
        state["sourcing_report"].recommended_offer_id
        or (state["sourcing_report"].offers[0].offer_id if state["sourcing_report"].offers else "")
    )
    if not target:
        raise RuntimeError("没有可采集的货源：寻源结果为空且未指定 source_url")

    item = get_source_item(target)
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
    attrs = (
        {str(k): str(v) for k, v in (item.get("props") or {}).items()}
        if isinstance(item.get("props"), dict)
        else {}
    )
    weight_kg, size = _extract_weight_size(attrs)
    draft = ProductDraft(
        source_offer_id=str(item.get("num_iid", "")),
        source_link=item.get("detail_url", ""),
        title_cn=item.get("title", ""),
        price_cny=float(item["price"]) if item.get("price") else None,
        min_order=int(item["min_num"]) if item.get("min_num") else None,
        skus=skus,
        images=image_urls,
        attributes=attrs,
        description_cn=str(item.get("desc", ""))[:5000],
        weight_kg=weight_kg,
        package_size_cm=size,
    )
    return {"product_draft": draft}
