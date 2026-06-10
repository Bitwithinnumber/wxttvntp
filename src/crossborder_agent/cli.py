"""CLI 入口：cba run --keyword "yoga mat" --keyword-cn 瑜伽垫 --platforms amazon,shopee"""

import json
import uuid

import typer
from rich.console import Console

from .graph import build_graph

app = typer.Typer(help="跨境电商上架前全链路 Agent")
console = Console()


@app.command()
def run(
    keyword: str = typer.Option(..., help="目标市场搜索关键词（英文）"),
    keyword_cn: str = typer.Option("", help="1688 货源搜索关键词（中文），默认同 keyword"),
    marketplace: str = typer.Option("amazon.com", help="目标市场站点"),
    platforms: str = typer.Option(
        "amazon", help="目标平台，逗号分隔: amazon,shopee,tiktok,ebay,shopify"
    ),
    languages: str = typer.Option("en", help="Listing 语言，逗号分隔: en,de,fr,es,ja"),
    source_url: str = typer.Option("", help="可选：直接指定货源链接，跳过寻源"),
    shipping_cny: float = typer.Option(0.0, help="头程物流估算/件（CNY，默认 25）"),
    target_margin: float = typer.Option(0.0, help="目标毛利率（如 0.3）"),
    thread_id: str = typer.Option("", help="流程 ID（用于断点恢复）"),
):
    """运行上架前全链路：选品 → 寻源 → 采集 → 定价 → 合规 → 内容 → 图片 → 资料包。"""
    graph = build_graph()
    tid = thread_id or uuid.uuid4().hex[:8]
    config = {"configurable": {"thread_id": tid}}
    state = {
        "keyword": keyword,
        "keyword_cn": keyword_cn or keyword,
        "marketplace": marketplace,
        "target_platforms": [p.strip() for p in platforms.split(",")],
        "target_languages": [lg.strip() for lg in languages.split(",")],
        "source_url": source_url,
    }
    if shipping_cny:
        state["shipping_cny"] = shipping_cny
    if target_margin:
        state["target_margin"] = target_margin
    console.print(f"[bold]流程 ID: {tid}[/bold]（中断后可用 --thread-id {tid} 恢复）")
    for event in graph.stream(state, config=config):
        for node, _update in event.items():
            console.print(f"[green]✔ 环节完成:[/green] {node}")
    final = graph.get_state(config).values
    pkgs = final.get("listing_packages", [])
    console.print(
        f"\n[bold green]完成！生成 {len(pkgs)} 个平台资料包（见 output/ 目录）[/bold green]"
    )
    for p in pkgs:
        console.print(f"  - {p.platform}: output/listing_{p.platform}.json / .xlsx")


@app.command()
def show(thread_id: str):
    """查看某次流程的当前状态。"""
    graph = build_graph()
    values = graph.get_state({"configurable": {"thread_id": thread_id}}).values
    console.print(json.dumps(
        {k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in values.items()},
        ensure_ascii=False, indent=2, default=str,
    ))


if __name__ == "__main__":
    app()
