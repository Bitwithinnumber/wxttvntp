"""实时汇率（exchangerate-api.com，免费开放端点可用）。"""

import httpx

from ..config import get_settings


def get_rates(base: str = "CNY") -> dict[str, float]:
    s = get_settings()
    if s.exchange_rate_api_key:
        url = f"https://v6.exchangerate-api.com/v6/{s.exchange_rate_api_key}/latest/{base}"
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()["conversion_rates"]
    resp = httpx.get(f"https://open.er-api.com/v6/latest/{base}", timeout=30)
    resp.raise_for_status()
    return resp.json()["rates"]
