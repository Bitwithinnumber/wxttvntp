export interface NodeInfo {
  id: string;
  label: string;
}

export interface Competitor {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  rating: number | null;
  reviews: number | null;
  link: string;
}

export interface MarketReport {
  keyword: string;
  marketplace: string;
  competitors: Competitor[];
  price_low: number | null;
  price_high: number | null;
  price_median: number | null;
  keyword_suggestions: string[];
  opportunity_score: number;
  analysis: string;
}

export interface SupplierOffer {
  offer_id: string;
  title: string;
  price_cny: number | null;
  min_order: number | null;
  seller: string;
  sales: string;
  link: string;
  pic_url: string;
}

export interface SourcingReport {
  keyword_cn: string;
  offers: SupplierOffer[];
  recommended_offer_id: string;
  analysis: string;
}

export interface SkuVariant {
  sku_id: string;
  properties: string;
  price_cny: number | null;
  stock: number | null;
}

export interface ProductDraft {
  source_offer_id: string;
  source_link: string;
  title_cn: string;
  price_cny: number | null;
  min_order: number | null;
  skus: SkuVariant[];
  images: string[];
  attributes: Record<string, string>;
  description_cn: string;
}

export interface PlatformPricing {
  platform: string;
  currency: string;
  suggested_price: number;
  cost_breakdown: Record<string, number>;
  gross_margin_pct: number;
  breakeven_price: number;
  market_fit: string;
}

export interface PricingReport {
  fx_rates: Record<string, number>;
  plans: PlatformPricing[];
  analysis: string;
}

export interface ComplianceIssue {
  severity: string;
  category: string;
  market: string;
  detail: string;
  suggestion: string;
}

export interface ComplianceReport {
  passed: boolean;
  hs_code_suggestion: string;
  issues: ComplianceIssue[];
  summary: string;
}

export interface LocalizedListing {
  language: string;
  title: string;
  bullet_points: string[];
  description: string;
  search_terms: string;
}

export interface ContentPack {
  listings: LocalizedListing[];
}

export interface ImageTask {
  url: string;
  role: string;
  issues: string[];
  actions: string[];
}

export interface ImagePlan {
  tasks: ImageTask[];
  summary: string;
}

export interface ListingPackage {
  platform: string;
  payload: { quality_issues?: string[] } & Record<string, unknown>;
  review_checklist: string[];
}

export interface PipelineState {
  market_report?: MarketReport;
  sourcing_report?: SourcingReport;
  product_draft?: ProductDraft;
  pricing_report?: PricingReport;
  compliance_report?: ComplianceReport;
  content_pack?: ContentPack;
  image_plan?: ImagePlan;
  listing_packages?: ListingPackage[];
}

export interface PipelineStatus {
  thread_id: string;
  status: string;
  error: string;
  next: string[];
  done_nodes: string[];
  state: PipelineState;
}
