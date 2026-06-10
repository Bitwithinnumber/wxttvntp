"""DDGS（DuckDuckGo 搜索）免费市场数据连接器：抓取 Amazon 竞品搜索结果。"""

import re

import httpx
from ddgs import DDGS

_IRRELEVANT_PATH = re.compile(r"/(e/[A-Z0-9]{10}|author|stores/page|gp/help|hz/)")


def get_keyword_suggestions(keyword: str, max_results: int = 10) -> list[str]:
    """DuckDuckGo 自动补全：真实搜索联想词，用于关键词调研。"""
    resp = httpx.get(
        "https://duckduckgo.com/ac/", params={"q": keyword, "type": "list"}, timeout=15
    )
    resp.raise_for_status()
    data = resp.json()
    suggestions = data[1] if isinstance(data, list) and len(data) > 1 else []
    return [s for s in suggestions if s.lower() != keyword.lower()][:max_results]


def search_amazon_via_ddgs(
    keyword: str, domain: str = "amazon.com", max_results: int = 15
) -> list[dict]:
    """通过 DuckDuckGo 限定 site:amazon 搜索竞品，返回标题/链接/摘要（含可解析价格）。"""
    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(f"site:{domain} {keyword}", max_results=max_results * 2):
            link = r.get("href", "")
            if _IRRELEVANT_PATH.search(link):
                continue
            asin_m = re.search(r"/dp/([A-Z0-9]{10})", link)
            snippet = f"{r.get('title', '')} {r.get('body', '')}"
            price_m = re.search(r"[$€£]\s?(\d+(?:[.,]\d{1,2})?)", snippet)
            price = float(price_m.group(1).replace(",", ".")) if price_m else None
            rating_m = re.search(r"(\d\.\d)\s*(?:out of 5|/5|stars)", snippet)
            reviews_m = re.search(r"([\d,]{2,})\s*(?:ratings|reviews|customer)", snippet)
            results.append(
                {
                    "asin": asin_m.group(1) if asin_m else "",
                    "title": r.get("title", ""),
                    "link": link,
                    "snippet": r.get("body", ""),
                    "extracted_price": price,
                    "rating": float(rating_m.group(1)) if rating_m else None,
                    "reviews": int(reviews_m.group(1).replace(",", "")) if reviews_m else None,
                }
            )
            if len(results) >= max_results:
                break
    return results
