"""⑦ 图片处理 Agent：真实下载校验 + Pillow 本地处理（1:1 白底扩边、放大到合规尺寸）。"""

import io
from pathlib import Path

import httpx

from ..config import get_settings
from ..models import ImagePlan, ImageTask
from ..state import PipelineState

MIN_MAIN_SIZE = 1000  # Amazon 主图最小边长要求（可缩放）


def _process(content: bytes, out_path: Path) -> tuple[int, int]:
    """真实图片处理：转 RGB → 白底扩边为 1:1 → 不足 1000px 时放大，保存 JPG。"""
    from PIL import Image  # noqa: PLC0415

    img = Image.open(io.BytesIO(content)).convert("RGB")
    w, h = img.size
    side = max(w, h)
    if side < MIN_MAIN_SIZE:
        scale = MIN_MAIN_SIZE / side
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        w, h = img.size
        side = max(w, h)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    canvas.save(out_path, "JPEG", quality=92)
    return canvas.size


def _inspect(url: str, idx: int, out_dir: Path) -> ImageTask:
    issues, actions = [], []
    width = height = None
    processed_file = ""
    role = "main" if idx == 0 else "gallery"
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        try:
            from PIL import Image  # noqa: PLC0415

            img = Image.open(io.BytesIO(resp.content))
            width, height = img.size
            if min(width, height) < MIN_MAIN_SIZE:
                issues.append(f"尺寸 {width}x{height} 低于主图建议最小边 {MIN_MAIN_SIZE}px")
            if width != height:
                issues.append("非 1:1 正方形")
            if issues:
                out_path = out_dir / f"img_{idx + 1}_processed.jpg"
                pw, ph = _process(resp.content, out_path)
                processed_file = out_path.name
                actions.append(f"已本地处理为 {pw}x{ph} 1:1 白底图（{out_path.name}）")
        except ImportError:
            actions.append("人工确认尺寸 ≥1000px 且为 1:1")
    except httpx.HTTPError as e:
        issues.append(f"图片不可访问: {e}")
        actions.append("更换图片源")
    if role == "main":
        actions.append("确保白底、商品占比 ≥85%、无水印/文字/logo")
    return ImageTask(
        url=url,
        role=role,
        issues=issues,
        actions=actions,
        width=width,
        height=height,
        processed_file=processed_file,
    )


def images_node(state: PipelineState) -> dict:
    draft = state["product_draft"]
    out_dir = Path(get_settings().output_dir) / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    tasks = []
    for idx, url in enumerate(draft.images[:9]):
        full = url if url.startswith("http") else f"https:{url}"
        tasks.append(_inspect(full, idx, out_dir))
    n_bad = sum(1 for t in tasks if t.issues)
    n_fixed = sum(1 for t in tasks if t.processed_file)
    return {
        "image_plan": ImagePlan(
            tasks=tasks,
            summary=(
                f"共 {len(tasks)} 张图片，{n_bad} 张存在问题，"
                f"{n_fixed} 张已本地处理为合规尺寸。"
            ),
        )
    }
