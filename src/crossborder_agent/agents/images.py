"""⑦ 图片处理 Agent：真实下载校验图片可达性/尺寸，生成处理任务清单。"""

import io

import httpx

from ..models import ImagePlan, ImageTask
from ..state import PipelineState

MIN_MAIN_SIZE = 1000  # Amazon 主图最小边长要求（可缩放）


def _inspect(url: str) -> tuple[list[str], list[str]]:
    issues, actions = [], []
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        try:
            from PIL import Image  # noqa: PLC0415

            img = Image.open(io.BytesIO(resp.content))
            w, h = img.size
            if min(w, h) < MIN_MAIN_SIZE:
                issues.append(f"尺寸 {w}x{h} 低于主图建议最小边 {MIN_MAIN_SIZE}px")
                actions.append("放大或重新获取高清图")
            if w != h:
                actions.append("裁剪为 1:1 正方形")
        except ImportError:
            actions.append("人工确认尺寸 ≥1000px 且为 1:1")
    except httpx.HTTPError as e:
        issues.append(f"图片不可访问: {e}")
        actions.append("更换图片源")
    return issues, actions


def images_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    tasks = []
    for idx, url in enumerate(draft.images[:9]):
        full = url if url.startswith("http") else f"https:{url}"
        issues, actions = _inspect(full)
        role = "main" if idx == 0 else "gallery"
        if role == "main":
            actions.append("确保白底、商品占比 ≥85%、无水印/文字/logo")
        tasks.append(ImageTask(url=full, role=role, issues=issues, actions=actions))
    n_bad = sum(1 for t in tasks if t.issues)
    return {
        "image_plan": ImagePlan(
            tasks=tasks,
            summary=f"共 {len(tasks)} 张图片，{n_bad} 张存在问题需处理。",
        )
    }
