"""⑧ Listing 资料包组装 Agent：按各平台字段规范输出即传即用的资料包。"""

import json
from pathlib import Path

from openpyxl import Workbook

from ..config import get_settings
from ..models import ListingPackage
from ..state import PipelineState

# 各平台硬性规则：标题最大长度/搜索词字节上限/最大图片数
PLATFORM_RULES = {
    "amazon": {"title_max": 200, "search_terms_bytes": 250, "max_images": 9},
    "shopee": {"title_max": 120, "search_terms_bytes": 0, "max_images": 9},
    "tiktok": {"title_max": 255, "search_terms_bytes": 0, "max_images": 9},
    "ebay": {"title_max": 80, "search_terms_bytes": 0, "max_images": 12},
    "shopify": {"title_max": 255, "search_terms_bytes": 0, "max_images": 50},
}

PLATFORM_FIELD_NOTES = {
    "amazon": "上传模板：类目批量上传表 (Flat File)；标题≤200字符，5 bullet points，搜索词≤250字节",
    "shopee": "标题≤120字符，描述≤3000字符，最多9张图",
    "tiktok": "标题≤255字符，主图1:1，需提供属性与合规资质",
    "ebay": "标题≤80字符，建议填写 Item Specifics",
    "shopify": "无硬性限制，建议 SEO title ≤70字符",
}


def _quality_check(platform: str, payload: dict) -> list[str]:
    rules = PLATFORM_RULES.get(platform, PLATFORM_RULES["amazon"])
    issues = []
    for listing in payload.get("listings", []):
        lang = listing.get("language", "")
        title = listing.get("title", "")
        if len(title) > rules["title_max"]:
            issues.append(f"[{lang}] 标题 {len(title)} 字符超出上限 {rules['title_max']}")
        if not title:
            issues.append(f"[{lang}] 标题为空")
        bullets = listing.get("bullet_points", [])
        if platform == "amazon" and len(bullets) != 5:
            issues.append(f"[{lang}] 卖点数 {len(bullets)} 不等于 5")
        st = listing.get("search_terms", "")
        limit = rules["search_terms_bytes"]
        if limit and len(st.encode("utf-8")) > limit:
            issues.append(f"[{lang}] 搜索词 {len(st.encode('utf-8'))} 字节超出上限 {limit}")
    imgs = payload.get("images", [])
    if not imgs:
        issues.append("无可用图片")
    elif len(imgs) > rules["max_images"]:
        issues.append(f"图片数 {len(imgs)} 超出上限 {rules['max_images']}")
    if not payload.get("price"):
        issues.append("缺少定价方案")
    return issues


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
        quality_issues = _quality_check(p, payload)
        payload["quality_issues"] = quality_issues
        checklist = ["人工复核标题与卖点是否准确", "确认主图已按要求处理", "核对最终售价与运费模板"]
        checklist = [f"【质检】{q}" for q in quality_issues] + checklist
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
