"""FastAPI 服务层：POST /pipeline 触发全链路，GET /pipeline/{thread_id} 查询状态。"""

import uuid
from typing import Any

from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel, Field

from .graph import build_graph

app = FastAPI(title="跨境电商上架前全链路 Agent")
_graph = None


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


def _run(state: dict, tid: str) -> None:
    graph().invoke(state, config={"configurable": {"thread_id": tid}})


@app.post("/pipeline")
def start_pipeline(req: PipelineRequest, background: BackgroundTasks) -> dict:
    tid = uuid.uuid4().hex[:8]
    state = req.model_dump()
    state["keyword_cn"] = state["keyword_cn"] or state["keyword"]
    background.add_task(_run, state, tid)
    return {"thread_id": tid, "status": "started"}


@app.get("/pipeline/{thread_id}")
def get_pipeline(thread_id: str) -> dict[str, Any]:
    snapshot = graph().get_state({"configurable": {"thread_id": thread_id}})
    values = snapshot.values
    return {
        "thread_id": thread_id,
        "next": list(snapshot.next),
        "state": {
            k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in values.items()
        },
    }
