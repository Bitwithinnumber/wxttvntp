import type { ReactNode } from "react";

interface Props {
  index: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Section({ index, title, subtitle, children }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 transition-colors duration-300 hover:border-zinc-700/80">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-400/70">
          {index}
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>
        {subtitle && <span className="num text-xs text-zinc-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
