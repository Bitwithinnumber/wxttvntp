"""⑤ 合规审核 Agent：LLM 基于商品信息做禁限售/知产/认证/税务初筛。"""

from ..connectors.llm import get_llm
from ..models import ComplianceReport
from ..state import PipelineState


def compliance_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    platforms = state.get("target_platforms", ["amazon"])
    marketplace = state.get("marketplace", "amazon.com")

    llm = get_llm(temperature=0.1)
    structured = llm.with_structured_output(ComplianceReport)
    report: ComplianceReport = structured.invoke(
        f"""你是跨境电商合规专家。对以下商品做上架前合规初筛，
目标平台 {platforms}，目标市场 {marketplace}。
逐项检查并填入 issues（severity: info/warning/blocker; category: prohibited/ip/certification/tax）：
1. 禁限售：是否含电池/液体/磁性/医疗/食品接触等敏感属性
2. 知识产权：标题/属性中是否含品牌词、外观侵权风险
3. 认证要求：CE/FCC/RoHS/FDA/CPC 等目标市场强制认证
4. 税务：建议 HS Code（hs_code_suggestion）、VAT/IOSS 提示
passed: 无 blocker 时为 true。summary 用中文总结。

商品标题：{draft.title_cn}
商品属性：{draft.attributes}
价格：¥{draft.price_cny}
"""
    )
    return {"compliance_report": report}
