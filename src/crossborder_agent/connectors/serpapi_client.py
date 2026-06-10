"""SerpApi 第三方 Amazon 数据接口（无需 Amazon 官方 API）。"""

import httpx

from ..config import get_settings

BASE_URL = "https://serpapi.com/search"


def _get(params: dict) -> dict:
    s = get_settings()
    if not s.serpapi_api_key:
        raise RuntimeError("缺少 SERPAPI_API_KEY，请在 .env 中配置")
    params = {**params, "api_key": s.serpapi_api_key}
    resp = httpx.get(BASE_URL, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


def search_amazon(keyword: str, domain: str = "amazon.com") -> list[dict]:
    """关键词搜索 Amazon，返回竞品列表。"""
    data = _get({"engine": "amazon", "amazon_domain": domain, "k": keyword})
    return data.get("organic_results", [])


def get_amazon_product(asin: str, domain: str = "amazon.com") -> dict:
    """获取单个 Amazon 商品详情。"""
    data = _get({"engine": "amazon_product", "amazon_domain": domain, "asin": asin})
    return data.get("product_results", data)
