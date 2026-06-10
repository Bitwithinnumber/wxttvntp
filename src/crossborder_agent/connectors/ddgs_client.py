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


def _parse_result(r: dict) -> dict:
    link = r.get("href", "")
    asin_m = re.search(r"/dp/([A-Z0-9]{10})", link)
    snippet = f"{r.get('title', '')} {r.get('body', '')}"
    price_m = re.search(r"[$€£]\s?(\d+(?:[.,]\d{1,2})?)", snippet)
    rating_m = re.search(r"(\d\.\d)\s*(?:out of 5|/5|stars)", snippet)
    reviews_m = re.search(r"([\d,]{2,})\s*(?:ratings|reviews|customer)", snippet)
    return {
        "asin": asin_m.group(1) if asin_m else "",
        "title": r.get("title", ""),
        "link": link,
        "snippet": r.get("body", ""),
        "extracted_price": float(price_m.group(1).replace(",", ".")) if price_m else None,
        "rating": float(rating_m.group(1)) if rating_m else None,
        "reviews": int(reviews_m.group(1).replace(",", "")) if reviews_m else None,
    }


def search_amazon_via_ddgs(
    keyword: str, domain: str = "amazon.com", max_results: int = 15
) -> list[dict]:
    """多查询策略搜竞品：优先 /dp/ 单品页，结果不足时自动补抓。"""
    queries = [
        f"site:{domain}/dp {keyword}",
        f"site:{domain} {keyword}",
        f"site:{domain} {keyword} stars ratings",
        f"site:{domain} best {keyword}",
    ]
    seen: set[str] = set()
    results: list[dict] = []
    with DDGS() as ddgs:
        for q in queries:
            n_dp = sum(1 for x in results if x["asin"])
            n_priced = sum(1 for x in results if x["extracted_price"])
            if len(results) >= max_results and n_dp >= 5 and n_priced >= 5:
                break  # 充分性自检通过，无需继续补抓
            try:
                rows = list(ddgs.text(q, max_results=max_results * 2))
            except Exception:
                continue
            for r in rows:
                link = r.get("href", "")
                if not link or link in seen or _IRRELEVANT_PATH.search(link):
                    continue
                seen.add(link)
                results.append(_parse_result(r))
    results.sort(key=lambda x: (not x["asin"], x["extracted_price"] is None))
    return results[:max_results]


def search_review_insights(keyword: str, max_results: int = 10) -> list[dict]:
    """抓取真实用户评论/讨论（reddit、测评站等），用于痛点挖掘。"""
    queries = [
        f"{keyword} complaints problems review",
        f"{keyword} reddit worth it disappointed",
    ]
    seen: set[str] = set()
    out: list[dict] = []
    with DDGS() as ddgs:
        for q in queries:
            if len(out) >= max_results:
                break
            try:
                rows = list(ddgs.text(q, max_results=max_results))
            except Exception:
                continue
            for r in rows:
                link = r.get("href", "")
                if not link or link in seen:
                    continue
                seen.add(link)
                out.append(
                    {"title": r.get("title", ""), "link": link, "body": r.get("body", "")}
                )
    return out[:max_results]
