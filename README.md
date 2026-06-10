# 爆款视频工厂 | Viral UGC Video Generator

上传商品图 + 输入信息 → AI 一键生成适配 **TikTok / Facebook** 的仿 UGC 爆款带货视频。

## 核心能力

- **6 大爆款模板**（逆向自数万条爆款视频）：UGC口播种草、开箱测评、痛点方案、前后对比、生活植入、ASMR质感流
- **豆包 LLM** (doubao-seed-1-6) 深度推理 → 生成钩子/脚本/分镜/文案/标签
- **gpt-image-2** → 基于商品参考图生成 UGC 风格首帧
- **Seedance 2.0 Fast** → 首帧锁定 + 参考图 + 原生配音 → 爆款视频
- 批量生成（最多 5 个差异化方案）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS |
| LLM | 火山方舟 doubao-seed-1-6（JSON 结构化输出 + 深度思考） |
| 图片 | gpt-image-2 via grsai 网关 |
| 视频 | Seedance 2.0 Fast (doubao-seedance-2-0-fast-260128) |

## 快速开始

```bash
cd web
cp .env.example .env.local  # 填入 API Key
npm install
npm run dev
```

打开 http://localhost:3000

## 环境变量

| 变量 | 说明 |
|---|---|
| `ARK_API_KEY` | 火山方舟 API Key |
| `GRSAI_API_KEY` | grsai 网关 Key |
