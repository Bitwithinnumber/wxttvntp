"""DDGS（DuckDuckGo 搜索）免费市场数据连接器：抓取 Amazon 竞品搜索结果。"""

import re

from ddgs import DDGS


def search_amazon_via_ddgs(
    keyword: str, domain: str = "amazon.com", max_results: int = 15
) -> list[dict]:
    """通过 DuckDuckGo 限定 site:amazon 搜索竞品，返回标题/链接/摘要（含可解析价格）。"""
    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(f"site:{domain} {keyword}", max_results=max_results):
            link = r.get("href", "")
            asin_m = re.search(r"/dp/([A-Z0-9]{10})", link)
            snippet = f"{r.get('title', '')} {r.get('body', '')}"
            price_m = re.search(r"[$€£]\s?(\d+(?:[.,]\d{1,2})?)", snippet)
            price = float(price_m.group(1).replace(",", ".")) if price_m else None
            results.append(
                {
                    "asin": asin_m.group(1) if asin_m else "",
                    "title": r.get("title", ""),
                    "link": link,
                    "snippet": r.get("body", ""),
                    "extracted_price": price,
                }
            )
    return results
