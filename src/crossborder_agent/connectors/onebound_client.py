"""万邦 OneBound 第三方货源数据接口（1688/淘宝，无需官方 API）。"""

import re

import httpx

from ..config import get_settings

BASE_URL = "https://api-gw.onebound.cn"


def _get(api_name: str, params: dict) -> dict:
    s = get_settings()
    if not s.onebound_api_key:
        raise RuntimeError("缺少 ONEBOUND_API_KEY，请在 .env 中配置")
    params = {**params, "key": s.onebound_api_key, "secret": s.onebound_api_secret}
    resp = httpx.get(f"{BASE_URL}/{s.sourcing_platform}/{api_name}", params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if data.get("error"):
        raise RuntimeError(f"OneBound API 错误: {data.get('error')} ({data.get('reason', '')})")
    return data


def search_source_items(keyword: str, page: int = 1) -> list[dict]:
    """货源平台（1688/淘宝）关键词搜索。"""
    data = _get("item_search", {"q": keyword, "page": page})
    return (data.get("items") or {}).get("item", [])


def get_source_item(item_url_or_id: str) -> dict:
    """获取货源商品详情（支持链接或商品 ID）。"""
    m = re.search(r"offer/(\d+)|[?&]id=(\d+)", item_url_or_id)
    num_iid = (m.group(1) or m.group(2)) if m else item_url_or_id
    data = _get("item_get", {"num_iid": num_iid})
    return data.get("item", {})
