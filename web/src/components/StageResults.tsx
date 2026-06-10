import { useState } from "react";
import { downloadUrl } from "../api";
import type { PipelineState } from "../types";
import Section from "./Section";

const SEVERITY_STYLE: Record<string, string> = {
  blocker: "border-red-500/40 bg-red-500/10 text-red-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  info: "border-zinc-700 bg-zinc-800/50 text-zinc-300",
};

export default function StageResults({ state, running }: { state: PipelineState; running?: boolean }) {
  const {
    market_report: market,
    sourcing_report: sourcing,
    product_draft: draft,
    pricing_report: pricing,
    compliance_report: compliance,
    content_pack: content,
    image_plan: images,
    listing_packages: packages,
  } = state;

  return (
    <div className="space-y-5">
      {market && (
        <Section
          index="01 / research"
          title="选品调研"
          subtitle={`${market.marketplace} · 机会评分 ${market.opportunity_score}/100 · 价格带 $${market.price_low ?? "?"}–$${market.price_high ?? "?"}${market.price_median ? ` · 中位价 $${market.price_median}` : ""}`}
        >
          {market.keyword_suggestions?.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-zinc-500">真实搜索联想词</span>
              {market.keyword_suggestions.map((s) => (
                <span key={s} className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 font-mono text-[11px] text-zinc-400">
                  {s}
                </span>
              ))}
            </div>
          )}
          {market.pain_points?.length > 0 && (
            <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">用户痛点（来自真实评论/讨论）</p>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {market.pain_points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400/70">!</span>
                    {p}
                  </li>
                ))}
              </ul>
              {market.differentiation && (
                <p className="mt-3 border-t border-zinc-800 pt-2.5 text-xs leading-relaxed text-emerald-300/90">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">差异化建议 </span>
                  {market.differentiation}
                </p>
              )}
            </div>
          )}
          <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
            {market.analysis}
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
            <table className="num w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">竞品标题</th>
                  <th className="px-3 py-2 font-medium">价格</th>
                  <th className="px-3 py-2 font-medium">评分</th>
                  <th className="px-3 py-2 font-medium">评论数</th>
                </tr>
              </thead>
              <tbody>
                {market.competitors.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-t border-zinc-800/60 text-zinc-300 transition-colors hover:bg-zinc-800/30">
                    <td className="max-w-md truncate px-3 py-2">
                      <a href={c.link} target="_blank" rel="noreferrer" className="transition-colors hover:text-emerald-300">
                        {c.title}
                      </a>
                    </td>
                    <td className="px-3 py-2">{c.price != null ? `$${c.price}` : "—"}</td>
                    <td className="px-3 py-2">{c.rating ?? "—"}</td>
                    <td className="px-3 py-2">{c.reviews ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {sourcing && (
        <Section index="02 / sourcing" title="供应商寻源" subtitle={`「${sourcing.keyword_cn}」· ${sourcing.offers.length} 个候选`}>
          <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{sourcing.analysis}</p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {sourcing.offers.slice(0, 6).map((o) => {
              const rec = o.offer_id === sourcing.recommended_offer_id;
              return (
                <a
                  key={o.offer_id}
                  href={o.link}
                  target="_blank"
                  rel="noreferrer"
                  className={`group rounded-xl border p-3.5 text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                    rec
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400/70"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                  }`}
                >
                  {rec && (
                    <span className="mb-1.5 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                      推荐
                    </span>
                  )}
                  <p className="line-clamp-2 text-zinc-300 transition-colors group-hover:text-zinc-100">{o.title}</p>
                  <p className="num mt-1.5 text-zinc-500">
                    ¥{o.price_cny ?? "—"}
                    {o.sales && ` · 销量 ${o.sales}`}
                    {o.seller && ` · ${o.seller}`}
                  </p>
                </a>
              );
            })}
          </div>
        </Section>
      )}

      {draft && (
        <Section index="03 / collect" title="商品采集" subtitle={`${draft.skus.length} SKU · ${draft.images.length} 图`}>
          <p className="mb-2 text-xs text-zinc-300">{draft.title_cn}</p>
          <p className="num mb-4 text-xs text-zinc-500">
            采购价 ¥{draft.price_cny ?? "—"}
            {draft.weight_kg != null && ` · 重量 ${draft.weight_kg}kg`}
            {draft.package_size_cm && ` · 尺寸 ${draft.package_size_cm}`} ·{" "}
            <a href={draft.source_link} target="_blank" rel="noreferrer" className="text-emerald-400/90 transition-colors hover:text-emerald-300">
              货源链接 ↗
            </a>
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {draft.images.slice(0, 6).map((u, i) => (
              <img
                key={i}
                src={u}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg border border-zinc-800 object-cover transition-transform duration-200 hover:scale-105"
              />
            ))}
          </div>
        </Section>
      )}

      {pricing && (
        <Section index="04 / pricing" title="利润测算定价">
          <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.plans.map((p) => (
              <div key={p.platform} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs transition-colors duration-200 hover:border-zinc-600">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500">{p.platform}</p>
                <p className="num text-xl font-semibold tracking-tight text-emerald-300">
                  {p.suggested_price} <span className="text-xs font-normal text-zinc-500">{p.currency}</span>
                </p>
                <p className="num mt-0.5 text-zinc-500">盈亏平衡 {p.breakeven_price} · 毛利 {p.gross_margin_pct}%</p>
                {p.price_tiers && Object.keys(p.price_tiers).length > 0 && (
                  <div className="num mt-2 flex gap-1.5">
                    {Object.entries(p.price_tiers).map(([k, v]) => (
                      <span key={k} className="rounded-md bg-zinc-800/80 px-2 py-1 text-[10px] text-zinc-300">
                        {k} <span className="text-emerald-300/90">{v}</span>
                      </span>
                    ))}
                  </div>
                )}
                {p.shipping_note && <p className="mt-1.5 text-[11px] text-zinc-500">{p.shipping_note}</p>}
                {p.market_fit && <p className="mt-1.5 text-[11px] text-zinc-400">{p.market_fit}</p>}
                <div className="num mt-3 space-y-1 border-t border-zinc-800 pt-2.5 text-zinc-500">
                  {Object.entries(p.cost_breakdown).map(([k, v]) => (
                    <p key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span>{v}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{pricing.analysis}</p>
        </Section>
      )}

      {compliance && (
        <Section
          index="05 / compliance"
          title="合规审核"
          subtitle={`${compliance.passed ? "通过" : "未通过 · 需先处理风险项"}${compliance.hs_code_suggestion ? ` · HS Code ${compliance.hs_code_suggestion}` : ""}`}
        >
          <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{compliance.summary}</p>
          <div className="space-y-2">
            {compliance.issues.map((iss, i) => (
              <div key={i} className={`rounded-lg border px-3.5 py-2.5 text-xs ${SEVERITY_STYLE[iss.severity] ?? SEVERITY_STYLE.info}`}>
                <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-wider">{iss.severity}</span>
                <span className="mr-2 text-zinc-500">[{iss.category}{iss.market && ` · ${iss.market}`}]</span>
                {iss.detail}
                {iss.suggestion && <p className="mt-1 text-zinc-400">建议：{iss.suggestion}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {content && <ContentSection listings={content.listings} />}

      {images && (
        <Section index="07 / images" title="图片处理" subtitle={images.summary}>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {images.tasks.map((t, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs transition-colors duration-200 hover:border-zinc-600">
                <img src={t.url} alt="" className="mb-2.5 h-28 w-full rounded-lg object-cover" />
                <p className="text-zinc-400">
                  <span className="mr-1.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    {t.role}
                  </span>
                  {t.width != null && <span className="num mr-1.5 text-zinc-500">{t.width}×{t.height}</span>}
                  {t.issues.length > 0 ? t.issues.join("；") : "无问题"}
                </p>
                {t.processed_file && (
                  <p className="mt-1 text-emerald-300/90">已本地处理 · {t.processed_file}</p>
                )}
                {t.actions.length > 0 && <p className="mt-1 text-amber-300/80">{t.actions.join("；")}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {packages && packages.length > 0 && (
        <Section index="08 / package" title="资料包组装" subtitle="即传即用上架资料包">
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((pkg) => (
              <div key={pkg.platform} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs transition-colors duration-200 hover:border-zinc-600">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-200">{pkg.platform}</span>
                  <span className="flex gap-2">
                    <a
                      href={downloadUrl(pkg.platform, "json")}
                      className="rounded-md border border-zinc-700 px-2.5 py-1 font-mono text-[11px] text-zinc-300 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-300 active:scale-[0.96]"
                    >
                      JSON
                    </a>
                    <a
                      href={downloadUrl(pkg.platform, "xlsx")}
                      className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] text-emerald-300 transition-all duration-200 hover:bg-emerald-500/25 active:scale-[0.96]"
                    >
                      Excel
                    </a>
                  </span>
                </div>
                <ul className="space-y-1.5 text-zinc-400">
                  {pkg.review_checklist.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zinc-600">·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {running && <StageSkeleton />}
    </div>
  );
}

function StageSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
      <div className="mb-5 flex items-baseline gap-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="space-y-2.5">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </section>
  );
}

function ContentSection({ listings }: { listings: { language: string; title: string; bullet_points: string[]; description: string; search_terms: string; title_variants: Record<string, string> }[] }) {
  const [lang, setLang] = useState(listings[0]?.language ?? "en");
  const current = listings.find((l) => l.language === lang) ?? listings[0];
  if (!current) return null;
  return (
    <Section index="06 / content" title="多语言内容">
      <div className="mb-4 flex gap-1.5">
        {listings.map((l) => (
          <button
            key={l.language}
            onClick={() => setLang(l.language)}
            className={`rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-[0.96] ${
              l.language === lang
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800/70 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {l.language}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm font-medium leading-snug text-zinc-100">{current.title}</p>
      {current.title_variants && Object.keys(current.title_variants).length > 0 && (
        <div className="mb-4 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">平台适配标题</p>
          {Object.entries(current.title_variants).map(([p, t]) => (
            <p key={p}>
              <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400/80">{p}</span>
              {t}
            </p>
          ))}
        </div>
      )}
      <ul className="mb-4 space-y-1.5 text-xs text-zinc-300">
        {current.bullet_points.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-emerald-400/70">—</span>
            {b}
          </li>
        ))}
      </ul>
      <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{current.description}</p>
      <p className="text-xs text-zinc-500">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">search terms </span>
        {current.search_terms}
      </p>
    </Section>
  );
}
