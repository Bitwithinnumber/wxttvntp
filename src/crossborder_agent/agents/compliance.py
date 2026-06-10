"""⑤ 合规审核 Agent：确定性规则库初筛 + LLM 深度审核（禁限售/知产/认证/税务）。"""

from ..connectors.llm import get_structured_llm
from ..models import ComplianceIssue, ComplianceReport
from ..state import PipelineState

# 知名品牌词（命中即 IP blocker）
BRAND_WORDS = [
    "nike", "adidas", "lululemon", "under armour", "puma", "new balance",
    "decathlon", "迪卡侬", "李宁", "安踏", "特步", "361", "鸿星尔克",
    "apple", "iphone", "samsung", "sony", "dyson", "disney", "迪士尼",
    "lego", "乐高", "hello kitty", "pokemon", "宝可梦", "漫威", "marvel",
]

# 敏感属性关键词 → (类目, 提示)
SENSITIVE_RULES = {
    "电池": ("prohibited", "含电池产品需 UN38.3 / MSDS，部分物流渠道受限"),
    "锂电": ("prohibited", "锂电池属航空敏感货，需特殊物流渠道与认证"),
    "液体": ("prohibited", "液体类产品多数小包渠道禁运，需特殊渠道"),
    "磁": ("prohibited", "含磁产品需鉴定报告，航空运输受限"),
    "食品": ("certification", "食品接触材料需 FDA(美)/LFGB(德) 认证"),
    "儿童": ("certification", "儿童产品需 CPC(美)/EN71(欧) 认证"),
    "玩具": ("certification", "玩具需 CPC(美)/CE-EN71(欧) 认证"),
    "医疗": ("prohibited", "医疗器械类目需要专门资质，普通卖家禁售"),
    "刀": ("prohibited", "刀具类目多平台限售，需类目审核"),
    "激光": ("certification", "激光产品需 FDA 注册（美国市场）"),
}


def _local_scan(text: str) -> list[ComplianceIssue]:
    issues = []
    lower = text.lower()
    for brand in BRAND_WORDS:
        if brand in lower:
            issues.append(
                ComplianceIssue(
                    severity="blocker",
                    category="ip",
                    market="全平台",
                    detail=f"标题/属性中含品牌词「{brand}」，存在知识产权侵权风险",
                    suggestion="去除品牌词，或取得授权后再上架",
                )
            )
    for kw, (cat, hint) in SENSITIVE_RULES.items():
        if kw in text:
            issues.append(
                ComplianceIssue(
                    severity="warning",
                    category=cat,
                    market="目标市场",
                    detail=f"商品信息命中敏感词「{kw}」：{hint}",
                    suggestion="确认产品实际属性，按要求准备认证/物流方案",
                )
            )
    return issues


def compliance_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    platforms = state.get("target_platforms", ["amazon"])
    marketplace = state.get("marketplace", "amazon.com")

    scan_text = f"{draft.title_cn} {draft.attributes} {draft.description_cn[:500]}"
    local_issues = _local_scan(scan_text)
    local_lines = "\n".join(f"- [{i.severity}] {i.detail}" for i in local_issues) or "无"

    structured = get_structured_llm(ComplianceReport, temperature=0.1)
    report: ComplianceReport = structured.invoke(
        f"""你是跨境电商合规专家。对以下商品做上架前合规初筛，
目标平台 {platforms}，目标市场 {marketplace}。
逐项检查并填入 issues（severity: info/warning/blocker; category: prohibited/ip/certification/tax）：
1. 禁限售：是否含电池/液体/磁性/医疗/食品接触等敏感属性
2. 知识产权：标题/属性中是否含品牌词、外观侵权风险
3. 认证要求：CE/FCC/RoHS/FDA/CPC 等目标市场强制认证
4. 税务：建议 HS Code（hs_code_suggestion）、VAT/IOSS 提示
本地规则库已命中以下问题（不要重复输出，补充规则库未覆盖的问题即可）：
{local_lines}
passed: 无 blocker 时为 true。summary 用中文总结。

商品标题：{draft.title_cn}
商品属性：{draft.attributes}
价格：¥{draft.price_cny}
"""
    )
    report.issues = local_issues + report.issues
    if any(i.severity == "blocker" for i in report.issues):
        report.passed = False
    return {"compliance_report": report}
