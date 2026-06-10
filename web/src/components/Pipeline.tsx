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
    <div className="flex flex-wrap items-center gap-1">
      {nodes.map((n, i) => {
        const done = doneNodes.includes(n.id);
        const active = running && i === currentIdx;
        const isFailed = failed && i === currentIdx;
        return (
          <div key={n.id} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
                done
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : isFailed
                    ? "bg-red-500/15 border-red-500/40 text-red-300"
                    : active
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300 animate-pulse"
                      : "bg-slate-800/60 border-slate-700 text-slate-400"
              }`}
            >
              <span>
                {done ? "✓" : isFailed ? "✕" : active ? "●" : i + 1}
              </span>
              {n.label}
            </div>
            {i < nodes.length - 1 && <span className="text-slate-600">→</span>}
          </div>
        );
      })}
    </div>
  );
}
