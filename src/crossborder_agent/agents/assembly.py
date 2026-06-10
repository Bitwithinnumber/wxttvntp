"""⑧ Listing 资料包组装 Agent：按各平台字段规范输出即传即用的资料包。"""

import json
from pathlib import Path

from openpyxl import Workbook

from ..config import get_settings
from ..models import ListingPackage
from ..state import PipelineState

PLATFORM_FIELD_NOTES = {
    "amazon": "上传模板：类目批量上传表 (Flat File)；标题≤200字符，5 bullet points，搜索词≤250字节",
    "shopee": "标题≤120字符，描述≤3000字符，最多9张图",
    "tiktok": "标题≤255字符，主图1:1，需提供属性与合规资质",
    "ebay": "标题≤80字符，建议填写 Item Specifics",
    "shopify": "无硬性限制，建议 SEO title ≤70字符",
}


def assembly_node(state: PipelineState) -> dict:
    s = get_settings()
    draft = state["product_draft"]
    pricing = state.get("pricing_report")
    compliance = state.get("compliance_report")
    content = state.get("content_pack")
    images = state.get("image_plan")
    platforms = state.get("target_platforms", ["amazon"])

    out_dir = Path(s.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    packages = []
    for p in platforms:
        plan = next((pl for pl in pricing.plans if pl.platform == p), None) if pricing else None
        payload = {
            "platform": p,
            "source": {"offer_id": draft.source_offer_id, "link": draft.source_link},
            "listings": [listing.model_dump() for listing in content.listings] if content else [],
            "price": plan.model_dump() if plan else {},
            "images": [t.model_dump() for t in images.tasks] if images else [],
            "skus": [sku.model_dump() for sku in draft.skus],
            "compliance": compliance.model_dump() if compliance else {},
            "field_notes": PLATFORM_FIELD_NOTES.get(p, ""),
        }
        checklist = ["人工复核标题与卖点是否准确", "确认主图已按要求处理", "核对最终售价与运费模板"]
        if compliance and not compliance.passed:
            checklist.insert(0, "存在合规 BLOCKER，必须先解决后再上架")

        pkg = ListingPackage(platform=p, payload=payload, review_checklist=checklist)
        packages.append(pkg)

        (out_dir / f"listing_{p}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        _write_xlsx(out_dir / f"listing_{p}.xlsx", pkg)

    return {"listing_packages": packages}


def _write_xlsx(path: Path, pkg: ListingPackage) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "listing"
    ws.append(["字段", "值"])
    payload = pkg.payload
    for listing in payload.get("listings", []):
        ws.append([f"标题({listing['language']})", listing["title"]])
        for i, bp in enumerate(listing.get("bullet_points", []), 1):
            ws.append([f"卖点{i}({listing['language']})", bp])
        ws.append([f"描述({listing['language']})", listing.get("description", "")])
        ws.append([f"搜索词({listing['language']})", listing.get("search_terms", "")])
    price = payload.get("price", {})
    if price:
        ws.append(["建议售价", f"{price.get('suggested_price')} {price.get('currency')}"])
        ws.append(["盈亏平衡价", price.get("breakeven_price")])
    for i, img in enumerate(payload.get("images", []), 1):
        ws.append([f"图片{i}({img.get('role')})", img.get("url")])
    ws.append(["平台规则", payload.get("field_notes", "")])
    wb.save(path)
