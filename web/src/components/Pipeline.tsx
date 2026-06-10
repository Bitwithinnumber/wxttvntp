import type { NodeInfo } from "../types";

interface Props {
  nodes: NodeInfo[];
  doneNodes: string[];
  running: boolean;
  failed: boolean;
}

export default function Pipeline({ nodes, doneNodes, running, failed }: Props) {
  const currentIdx = doneNodes.length;
  return (
    <ol className="grid grid-cols-4 gap-y-4 sm:grid-cols-8">
      {nodes.map((n, i) => {
        const done = doneNodes.includes(n.id);
        const active = running && i === currentIdx;
        const isFailed = failed && i === currentIdx;
        return (
          <li key={n.id} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                className={`absolute left-[-50%] top-[13px] h-px w-full transition-colors duration-500 ${
                  done || active || isFailed ? "bg-emerald-500/50" : "bg-zinc-800"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] transition-all duration-300 ${
                done
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : isFailed
                    ? "border-red-500/60 bg-red-500/15 text-red-300"
                    : active
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-600"
              }`}
            >
              {done ? "✓" : isFailed ? "✕" : i + 1}
              {active && (
                <span className="absolute inset-0 animate-ping rounded-full border border-emerald-400/60" />
              )}
            </span>
            <span
              className={`text-[11px] leading-tight transition-colors duration-300 ${
                done || active ? "text-zinc-300" : isFailed ? "text-red-300" : "text-zinc-600"
              }`}
            >
              {n.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
