from pydantic import BaseModel, Field


class CompetitorProduct(BaseModel):
    asin: str = ""
    title: str = ""
    price: float | None = None
    currency: str = "USD"
    rating: float | None = None
    reviews: int | None = None
    link: str = ""


class MarketReport(BaseModel):
    keyword: str
    marketplace: str = "amazon.com"
    competitors: list[CompetitorProduct] = Field(default_factory=list)
    price_low: float | None = None
    price_high: float | None = None
    price_median: float | None = None
    keyword_suggestions: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)  # 来自真实评论/讨论的痛点
    differentiation: str = ""  # 差异化切入建议
    opportunity_score: int = 0  # 0-100
    analysis: str = ""


class SupplierOffer(BaseModel):
    offer_id: str
    title: str = ""
    price_cny: float | None = None
    min_order: int | None = None
    seller: str = ""
    sales: str = ""
    link: str = ""
    pic_url: str = ""


class SourcingReport(BaseModel):
    keyword_cn: str = ""
    offers: list[SupplierOffer] = Field(default_factory=list)
    recommended_offer_id: str = ""
    analysis: str = ""


class SkuVariant(BaseModel):
    sku_id: str = ""
    properties: str = ""
    price_cny: float | None = None
    stock: int | None = None


class ProductDraft(BaseModel):
    source_offer_id: str = ""
    source_link: str = ""
    title_cn: str = ""
    price_cny: float | None = None
    min_order: int | None = None
    skus: list[SkuVariant] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    attributes: dict[str, str] = Field(default_factory=dict)
    description_cn: str = ""
    weight_kg: float | None = None  # 从属性提取的重量
    package_size_cm: str = ""  # 从属性提取的尺寸/规格


class PlatformPricing(BaseModel):
    platform: str
    currency: str
    suggested_price: float
    cost_breakdown: dict[str, float] = Field(default_factory=dict)
    gross_margin_pct: float = 0.0
    breakeven_price: float = 0.0
    market_fit: str = ""  # 与竞品价格带的关系
    price_tiers: dict[str, float] = Field(default_factory=dict)  # 日常/促销/底价
    shipping_note: str = ""  # 头程估算依据


class PricingReport(BaseModel):
    fx_rates: dict[str, float] = Field(default_factory=dict)
    plans: list[PlatformPricing] = Field(default_factory=list)
    analysis: str = ""


class ComplianceIssue(BaseModel):
    severity: str = "info"  # info | warning | blocker
    category: str = ""  # prohibited | ip | certification | tax
    market: str = ""
    detail: str = ""
    suggestion: str = ""


class ComplianceReport(BaseModel):
    passed: bool = True
    hs_code_suggestion: str = ""
    issues: list[ComplianceIssue] = Field(default_factory=list)
    summary: str = ""


class LocalizedListing(BaseModel):
    language: str
    title: str = ""
    bullet_points: list[str] = Field(default_factory=list)
    description: str = ""
    search_terms: str = ""
    title_variants: dict[str, str] = Field(default_factory=dict)  # 平台→适配标题


class ContentPack(BaseModel):
    listings: list[LocalizedListing] = Field(default_factory=list)


class ImageTask(BaseModel):
    url: str
    role: str = "gallery"  # main | gallery | detail
    issues: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    width: int | None = None
    height: int | None = None
    processed_file: str = ""  # 本地处理后（1:1/放大）的文件名


class ImagePlan(BaseModel):
    tasks: list[ImageTask] = Field(default_factory=list)
    summary: str = ""


class ListingPackage(BaseModel):
    platform: str
    payload: dict = Field(default_factory=dict)
    review_checklist: list[str] = Field(default_factory=list)
