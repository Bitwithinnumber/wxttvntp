from typing import TypedDict

from .models import (
    ComplianceReport,
    ContentPack,
    ImagePlan,
    ListingPackage,
    MarketReport,
    PricingReport,
    ProductDraft,
    SourcingReport,
)


class PipelineState(TypedDict, total=False):
    # 输入
    keyword: str  # 目标市场关键词（英文）
    keyword_cn: str  # 货源搜索关键词（中文）
    marketplace: str  # 如 amazon.com / amazon.de
    target_platforms: list[str]  # amazon / shopee / tiktok / ebay / shopify
    target_languages: list[str]  # en / de / fr / es / ja ...
    source_url: str  # 可选：直接指定 1688 货源链接，跳过寻源

    # 各环节产出
    market_report: MarketReport
    sourcing_report: SourcingReport
    product_draft: ProductDraft
    pricing_report: PricingReport
    compliance_report: ComplianceReport
    content_pack: ContentPack
    image_plan: ImagePlan
    listing_packages: list[ListingPackage]

    errors: list[str]
