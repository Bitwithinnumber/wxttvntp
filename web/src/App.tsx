import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNodes, fetchStatus, startPipeline } from "./api";
import Pipeline from "./components/Pipeline";
import StageResults from "./components/StageResults";
import type { NodeInfo, PipelineStatus } from "./types";

const PLATFORMS = ["amazon", "shopee", "tiktok", "ebay", "shopify"];
const LANGUAGES = ["en", "de", "fr", "es", "ja"];

export default function App() {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [keyword, setKeyword] = useState("yoga mat");
  const [keywordCn, setKeywordCn] = useState("瑜伽垫");
  const [marketplace, setMarketplace] = useState("amazon.com");
  const [platforms, setPlatforms] = useState<string[]>(["amazon", "shopee"]);
  const [languages, setLanguages] = useState<string[]>(["en", "de"]);
  const [shippingCny, setShippingCny] = useState("25");
  const [targetMargin, setTargetMargin] = useState("30");
  const [threadId, setThreadId] = useState("");
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    fetchNodes().then(setNodes).catch((e) => setError(String(e)));
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const poll = useCallback((tid: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await fetchStatus(tid);
        setStatus(s);
        if (s.status === "done" || s.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch (e) {
        setError(String(e));
      }
    }, 3000);
  }, []);

  const running = status?.status === "running";

  async function onStart(resumeTid?: string) {
    setError("");
    try {
      const r = await startPipeline({
        keyword,
        keyword_cn: keywordCn,
        marketplace,
        target_platforms: platforms,
        target_languages: languages,
        shipping_cny: parseFloat(shippingCny) || 0,
        target_margin: (parseFloat(targetMargin) || 0) / 100,
        thread_id: resumeTid || undefined,
      });
      setThreadId(r.thread_id);
      setStatus(null);
      poll(r.thread_id);
    } catch (e) {
      setError(String(e));
    }
  }

  function toggle(list: string[], set: (v: string[]) => void, item: string) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">跨境电商全链路 Agent 控制台</h1>
        <p className="mt-1 text-xs text-slate-500">
          上架前 8 环节端到端：选品 → 寻源 → 采集 → 定价 → 合规 → 内容 → 图片 → 资料包（真实第三方数据源）
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="目标市场关键词（英文）">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input" />
          </Field>
          <Field label="货源关键词（中文）">
            <input value={keywordCn} onChange={(e) => setKeywordCn(e.target.value)} className="input" />
          </Field>
          <Field label="市场站点">
            <input value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="input" />
          </Field>
          <Field label="头程物流（CNY/件）/ 目标毛利（%）">
            <div className="flex gap-2">
              <input value={shippingCny} onChange={(e) => setShippingCny(e.target.value)} className="input w-1/2" />
              <input value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} className="input w-1/2" />
            </div>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="目标平台">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Chip key={p} active={platforms.includes(p)} onClick={() => toggle(platforms, setPlatforms, p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Listing 语言">
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Chip key={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onStart()}
            disabled={running || !keyword || platforms.length === 0 || languages.length === 0}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "运行中…" : "启动全链路"}
          </button>
          {status?.status === "failed" && threadId && (
            <button onClick={() => onStart(threadId)} className="rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500">
              从断点续跑
            </button>
          )}
          {threadId && <span className="text-xs text-slate-500">流程 ID: {threadId}</span>}
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {status?.error && <p className="mt-3 text-xs text-red-400">运行失败：{status.error}</p>}
      </div>

      {(threadId || status) && nodes.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <Pipeline
            nodes={nodes}
            doneNodes={status?.done_nodes ?? []}
            running={running}
            failed={status?.status === "failed"}
          />
        </div>
      )}

      {status && <StageResults state={status.state} />}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(30 41 59);
          background: rgb(2 6 23);
          padding: 0.45rem 0.7rem;
          font-size: 0.8rem;
          color: rgb(226 232 240);
          outline: none;
        }
        .input:focus { border-color: rgb(14 165 233 / 0.6); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
          : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
