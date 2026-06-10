# 跨境电商上架前全链路 AI Agent

基于 **LangGraph** 的多 Agent 编排系统，覆盖跨境电商上架前的全部 8 个环节，最终产出「即传即用」的各平台 Listing 资料包（不做最终上架）。数据源全部使用真实第三方 API，不依赖各平台官方 API。

```
①选品调研 → ②供应商寻源(1688) → ③商品采集 → ④利润测算定价
→ ⑤合规审核 → ⑥多语言内容生成 → ⑦图片处理 → ⑧Listing 资料包组装
```

## 架构

- **编排**：LangGraph StateGraph，SQLite checkpoint 持久化，任意环节中断后可用 `--thread-id` 恢复
- **数据源（全部真实第三方服务）**：
  - ddgs（DuckDuckGo 免费，默认）或 SerpApi — Amazon 竞品/市场数据（无需 Amazon 官方 API）
  - 万邦 OneBound — 1688/淘宝货源搜索/详情（无需官方 API，`SOURCING_PLATFORM` 可切换）
  - exchangerate-api / open.er-api — 实时汇率
- **LLM**：OpenAI / Anthropic / DeepSeek / 通义（OpenAI 兼容模式）可配置切换
- **输出**：每个目标平台一份 `output/listing_<platform>.json` + `.xlsx` 资料包

## 快速开始

```bash
uv sync
cp .env.example .env   # 填入 API Key
uv run cba run --keyword "yoga mat" --keyword-cn 瑜伽垫 \
  --platforms amazon,shopee --languages en,de
```

断点恢复 / 查看状态：

```bash
uv run cba run --keyword "yoga mat" --thread-id <id>
uv run cba show <thread_id>
```

API 服务：

```bash
uv run uvicorn crossborder_agent.api:app --port 8000
# POST /pipeline  启动流程；GET /pipeline/{thread_id} 查询状态
```

## 所需 Key（见 .env.example）

| 变量 | 服务 | 用途 |
|---|---|---|
| `OPENAI_API_KEY` 等 | OpenAI/Anthropic/DeepSeek/通义 | 分析与内容生成 |
| `SERPAPI_API_KEY` | serpapi.com（可选，默认 ddgs 免费） | Amazon 竞品数据 |
| `ONEBOUND_API_KEY/SECRET` | open.onebound.cn | 1688/淘宝货源数据 |
| `EXCHANGE_RATE_API_KEY` | exchangerate-api.com（可留空） | 实时汇率 |

## 开发

```bash
uv run ruff check .
uv run pytest
```
