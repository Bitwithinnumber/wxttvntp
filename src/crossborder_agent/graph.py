"""LangGraph Supervisor 编排：上架前 8 环节顺序主链，checkpoint 持久化可恢复。"""

import sqlite3

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from .agents.assembly import assembly_node
from .agents.collection import collection_node
from .agents.compliance import compliance_node
from .agents.content import content_node
from .agents.images import images_node
from .agents.market_research import market_research_node
from .agents.pricing import pricing_node
from .agents.sourcing import sourcing_node
from .config import get_settings

NODES = [
    ("market_research", market_research_node),
    ("sourcing", sourcing_node),
    ("collection", collection_node),
    ("pricing", pricing_node),
    ("compliance", compliance_node),
    ("content", content_node),
    ("images", images_node),
    ("assembly", assembly_node),
]


def build_graph(checkpoint: bool = True):
    from .state import PipelineState

    g = StateGraph(PipelineState)
    for name, fn in NODES:
        g.add_node(name, fn)
    g.add_edge(START, NODES[0][0])
    for (a, _), (b, _) in zip(NODES, NODES[1:], strict=False):
        g.add_edge(a, b)
    g.add_edge(NODES[-1][0], END)

    if checkpoint:
        conn = sqlite3.connect(get_settings().checkpoint_db, check_same_thread=False)
        return g.compile(checkpointer=SqliteSaver(conn))
    return g.compile()
