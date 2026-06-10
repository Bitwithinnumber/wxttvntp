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
    opportunity_score: int = 0  # 0-100
    analysis: str = ""


class SupplierOffer(BaseModel):
    offer_id: str
    title: str = ""
    price_cny: float | None = None
    min_order: int | None = None
    seller: str = ""
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


class PlatformPricing(BaseModel):
    platform: str
    currency: str
    suggested_price: float
    cost_breakdown: dict[str, float] = Field(default_factory=dict)
    gross_margin_pct: float = 0.0
    breakeven_price: float = 0.0


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


class ContentPack(BaseModel):
    listings: list[LocalizedListing] = Field(default_factory=list)


class ImageTask(BaseModel):
    url: str
    role: str = "gallery"  # main | gallery | detail
    issues: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)


class ImagePlan(BaseModel):
    tasks: list[ImageTask] = Field(default_factory=list)
    summary: str = ""


class ListingPackage(BaseModel):
    platform: str
    payload: dict = Field(default_factory=dict)
    review_checklist: list[str] = Field(default_factory=list)
