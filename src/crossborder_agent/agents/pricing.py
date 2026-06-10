"""④ 利润测算与定价 Agent：实时汇率 + 平台费率 + LLM 定价分析。"""

from ..connectors.exchange_rate import get_rates
from ..connectors.llm import get_llm
from ..models import PlatformPricing, PricingReport
from ..state import PipelineState

# 各平台典型佣金率（参考值，可按类目细化）
PLATFORM_FEES = {
    "amazon": {"currency": "USD", "commission": 0.15, "fulfillment": 4.5},
    "shopee": {"currency": "USD", "commission": 0.08, "fulfillment": 2.0},
    "tiktok": {"currency": "USD", "commission": 0.08, "fulfillment": 2.5},
    "ebay": {"currency": "USD", "commission": 0.13, "fulfillment": 3.0},
    "shopify": {"currency": "USD", "commission": 0.029, "fulfillment": 3.0},
}
DEFAULT_SHIPPING_CNY = 25.0  # 无重量数据时的头程估算（每件）
AIR_CNY_PER_KG = 55.0  # 空派单价（含派送，参考价）
SEA_CNY_PER_KG = 14.0  # 海派单价（含派送，参考价）
MIN_SHIPPING_CNY = 8.0
TARGET_MARGIN = 0.30
AD_PROVISION = 0.08  # 广告预提（占售价）
RETURN_PROVISION = 0.03  # 退货预提
FX_BUFFER = 0.02  # 汇损 buffer


def _estimate_shipping(state: PipelineState, weight_kg: float | None) -> tuple[float, str]:
    """头程估算：用户指定 > 按重量×运输方式 > 默认值。"""
    if state.get("shipping_cny"):
        return float(state["shipping_cny"]), "用户指定单件头程成本"
    if weight_kg:
        air = max(weight_kg * AIR_CNY_PER_KG, MIN_SHIPPING_CNY)
        sea = max(weight_kg * SEA_CNY_PER_KG, MIN_SHIPPING_CNY)
        return round(air, 2), (
            f"按重量 {weight_kg}kg 估算：空派 ¥{air:.1f}（采用）/ 海派 ¥{sea:.1f}（备货期长但更低）"
        )
    return DEFAULT_SHIPPING_CNY, f"未提取到重量数据，按默认 ¥{DEFAULT_SHIPPING_CNY}/件估算"


def pricing_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    cost_cny = draft.price_cny or 0.0
    rates = get_rates("CNY")
    platforms = state.get("target_platforms", ["amazon"])
    shipping_cny, shipping_note = _estimate_shipping(state, draft.weight_kg)
    target_margin = state.get("target_margin") or TARGET_MARGIN

    market = state.get("market_report")
    band = (market.price_low, market.price_high) if market and market.price_low else None

    plans = []
    for p in platforms:
        fee = PLATFORM_FEES.get(p, PLATFORM_FEES["amazon"])
        cur = fee["currency"]
        rate = rates.get(cur, 0.14)
        landed_cost = (cost_cny + shipping_cny) * rate + fee["fulfillment"]
        pct_costs = fee["commission"] + AD_PROVISION + RETURN_PROVISION + FX_BUFFER
        breakeven = landed_cost / (1 - pct_costs)
        suggested = round(landed_cost / (1 - pct_costs - target_margin), 2)
        if band and cur == "USD":
            if suggested < band[0]:
                fit = f"低于竞品价格带 {band[0]}~{band[1]}，有价格优势"
            elif suggested > band[1]:
                fit = f"高于竞品价格带 {band[0]}~{band[1]}，需差异化支撑溢价"
            else:
                fit = f"落在竞品价格带 {band[0]}~{band[1]} 内"
        else:
            fit = ""
        plans.append(
            PlatformPricing(
                platform=p,
                currency=cur,
                suggested_price=suggested,
                market_fit=fit,
                cost_breakdown={
                    "采购成本": round(cost_cny * rate, 2),
                    "头程物流": round(shipping_cny * rate, 2),
                    "履约费": fee["fulfillment"],
                    "平台佣金率": fee["commission"],
                    "广告预提率": AD_PROVISION,
                    "退货预提率": RETURN_PROVISION,
                    "汇损预提率": FX_BUFFER,
                },
                gross_margin_pct=round(target_margin * 100, 1),
                breakeven_price=round(breakeven, 2),
                price_tiers={
                    "日常价": suggested,
                    "促销价": round(max(suggested * 0.9, breakeven), 2),
                    "底价": round(breakeven, 2),
                },
                shipping_note=shipping_note,
            )
        )

    llm = get_llm()
    band_desc = (
        f"竞品价格带 {band[0]}~{band[1]} USD，中位价 {market.price_median or '?'}"
        if band
        else "无竞品价格数据"
    )
    plan_lines = "\n".join(
        f"- {pl.platform}: 建议价 {pl.suggested_price} {pl.currency}, 盈亏平衡 {pl.breakeven_price}"
        + (f"（{pl.market_fit}）" if pl.market_fit else "")
        for pl in plans
    )
    analysis = llm.invoke(
        f"""你是跨境电商定价专家。商品采购成本 ¥{cost_cny}，{band_desc}。
测算结果：
{plan_lines}
请用中文给出定价策略建议（是否落在竞品价格带、新品期/稳定期定价、促销空间），200字内。"""
    ).content
    return {
        "pricing_report": PricingReport(
            fx_rates={k: rates[k] for k in ("USD", "EUR", "GBP", "JPY") if k in rates},
            plans=plans,
            analysis=str(analysis),
        )
    }
