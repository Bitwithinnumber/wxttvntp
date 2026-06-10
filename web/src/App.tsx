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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    fetchNodes().then(setNodes).catch((e) => setError(String(e)));
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!startedAt || status?.status !== "running") return;
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [startedAt, status?.status]);

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
      setStartedAt(Date.now());
      setElapsed(0);
      poll(r.thread_id);
    } catch (e) {
      setError(String(e));
    }
  }

  function toggle(list: string[], set: (v: string[]) => void, item: string) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400/80">
            cross-border &middot; pre-listing pipeline
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            跨境电商全链路 Agent 控制台
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            选品调研 → 寻源 → 采集 → 定价 → 合规 → 内容 → 图片 → 资料包，全程真实第三方数据
          </p>
        </div>
        {running && (
          <div className="num shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
            运行中 {elapsed}s
          </div>
        )}
      </header>

      <div className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="目标市场关键词（英文）">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input" placeholder="yoga mat" />
          </Field>
          <Field label="货源关键词（中文）">
            <input value={keywordCn} onChange={(e) => setKeywordCn(e.target.value)} className="input" placeholder="瑜伽垫" />
          </Field>
          <Field label="市场站点">
            <input value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="input" />
          </Field>
          <Field label="头程物流 CNY/件 · 目标毛利 %">
            <div className="flex gap-2">
              <input value={shippingCny} onChange={(e) => setShippingCny(e.target.value)} className="input num w-1/2" />
              <input value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} className="input num w-1/2" />
            </div>
          </Field>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => onStart()}
            disabled={running || !keyword || platforms.length === 0 || languages.length === 0}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "运行中…" : "启动全链路"}
          </button>
          {status?.status === "failed" && threadId && (
            <button
              onClick={() => onStart(threadId)}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-all duration-200 hover:bg-amber-500/20 active:scale-[0.98]"
            >
              从断点续跑
            </button>
          )}
          {threadId && (
            <span className="font-mono text-xs text-zinc-600">thread {threadId.slice(0, 8)}</span>
          )}
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {status?.error && <p className="mt-3 text-xs text-red-400">运行失败：{status.error}</p>}
      </div>

      {(threadId || status) && nodes.length > 0 && (
        <div className="mb-8">
          <Pipeline
            nodes={nodes}
            doneNodes={status?.done_nodes ?? []}
            running={running}
            failed={status?.status === "failed"}
          />
        </div>
      )}

      {!threadId && !status && (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">ready</p>
          <p className="mt-3 text-sm text-zinc-500">
            填好关键词与目标平台，点击「启动全链路」开始。
            <br />
            每个环节的真实数据结果会实时显示在这里。
          </p>
        </div>
      )}

      {status && <StageResults state={status.state} running={running} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-all duration-200 active:scale-[0.96] ${
        active
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
