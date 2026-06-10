"""FastAPI 服务层：POST /pipeline 触发全链路，GET /pipeline/{thread_id} 查询进度与结果。"""

import uuid
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .config import get_settings
from .graph import NODES, build_graph

app = FastAPI(title="跨境电商上架前全链路 Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
_graph = None
_runs: dict[str, dict] = {}  # thread_id -> {status, error, done_nodes}


def graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


class PipelineRequest(BaseModel):
    keyword: str
    keyword_cn: str = ""
    marketplace: str = "amazon.com"
    target_platforms: list[str] = Field(default_factory=lambda: ["amazon"])
    target_languages: list[str] = Field(default_factory=lambda: ["en"])
    source_url: str = ""
    shipping_cny: float = 0.0
    target_margin: float = 0.0
    thread_id: str = ""  # 传入已有 ID 可断点续跑


def _run(state: dict | None, tid: str) -> None:
    run = _runs[tid]
    try:
        for event in graph().stream(state, config={"configurable": {"thread_id": tid}}):
            run["done_nodes"].extend(event.keys())
        run["status"] = "done"
    except Exception as e:  # noqa: BLE001
        run["status"] = "failed"
        run["error"] = str(e)


@app.get("/nodes")
def list_nodes() -> list[dict]:
    return [{"id": name, "label": label} for name, label, _fn in NODES]


@app.post("/pipeline")
def start_pipeline(req: PipelineRequest, background: BackgroundTasks) -> dict:
    tid = req.thread_id or uuid.uuid4().hex[:8]
    resume = bool(req.thread_id)
    state: dict | None
    if resume:
        state = None  # 从 checkpoint 续跑
    else:
        state = req.model_dump(exclude={"thread_id"})
        state["keyword_cn"] = state["keyword_cn"] or state["keyword"]
        if not state["shipping_cny"]:
            state.pop("shipping_cny")
        if not state["target_margin"]:
            state.pop("target_margin")
    _runs[tid] = {"status": "running", "error": "", "done_nodes": []}
    background.add_task(_run, state, tid)
    return {"thread_id": tid, "status": "started", "resumed": resume}


@app.get("/pipeline/{thread_id}")
def get_pipeline(thread_id: str) -> dict[str, Any]:
    snapshot = graph().get_state({"configurable": {"thread_id": thread_id}})
    values = snapshot.values
    run = _runs.get(thread_id, {})
    done = [name for name, _l, _f in NODES if name in values_done(values)]
    return {
        "thread_id": thread_id,
        "status": run.get("status", "unknown"),
        "error": run.get("error", ""),
        "next": list(snapshot.next),
        "done_nodes": done,
        "state": {
            k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in values.items()
        },
    }


NODE_OUTPUT_KEY = {
    "market_research": "market_report",
    "sourcing": "sourcing_report",
    "collection": "product_draft",
    "pricing": "pricing_report",
    "compliance": "compliance_report",
    "content": "content_pack",
    "images": "image_plan",
    "assembly": "listing_packages",
}


def values_done(values: dict) -> list[str]:
    return [node for node, key in NODE_OUTPUT_KEY.items() if values.get(key)]


@app.get("/download/{platform}/{fmt}")
def download(platform: str, fmt: str) -> FileResponse:
    if fmt not in ("json", "xlsx"):
        raise HTTPException(400, "fmt 必须是 json 或 xlsx")
    path = Path(get_settings().output_dir) / f"listing_{platform}.{fmt}"
    if not path.exists():
        raise HTTPException(404, f"{path} 不存在")
    return FileResponse(path, filename=path.name)
