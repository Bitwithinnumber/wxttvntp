from crossborder_agent.agents.pricing import PLATFORM_FEES
from crossborder_agent.graph import NODES, build_graph
from crossborder_agent.models import ProductDraft


def test_graph_compiles_with_all_nodes():
    graph = build_graph(checkpoint=False)
    node_names = [n for n, _ in NODES]
    assert node_names == [
        "market_research",
        "sourcing",
        "collection",
        "pricing",
        "compliance",
        "content",
        "images",
        "assembly",
    ]
    for name in node_names:
        assert name in graph.get_graph().nodes


def test_platform_fees_cover_supported_platforms():
    assert set(PLATFORM_FEES) == {"amazon", "shopee", "tiktok", "ebay", "shopify"}


def test_product_draft_defaults():
    d = ProductDraft()
    assert d.skus == [] and d.images == []
