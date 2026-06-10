import { useState } from "react";
import { downloadUrl } from "../api";
import type { PipelineState } from "../types";
import Section from "./Section";

const SEVERITY_STYLE: Record<string, string> = {
  blocker: "bg-red-500/15 text-red-300 border-red-500/40",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  info: "bg-sky-500/15 text-sky-300 border-sky-500/40",
};

export default function StageResults({ state }: { state: PipelineState }) {
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
    <div className="space-y-4">
      {market && (
        <Section
          title="① 选品调研"
          subtitle={`${market.marketplace} · 机会评分 ${market.opportunity_score}/100 · 价格带 $${market.price_low ?? "?"} - $${market.price_high ?? "?"}`}
        >
          <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
            {market.analysis}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-3">竞品标题</th>
                  <th className="py-1 pr-3">价格</th>
                  <th className="py-1 pr-3">评分</th>
                  <th className="py-1">评论数</th>
                </tr>
              </thead>
              <tbody>
                {market.competitors.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-t border-slate-800 text-slate-300">
                    <td className="max-w-md truncate py-1.5 pr-3">
                      <a href={c.link} target="_blank" rel="noreferrer" className="hover:text-sky-300">
                        {c.title}
                      </a>
                    </td>
                    <td className="py-1.5 pr-3">{c.price != null ? `$${c.price}` : "—"}</td>
                    <td className="py-1.5 pr-3">{c.rating ?? "—"}</td>
                    <td className="py-1.5">{c.reviews ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {sourcing && (
        <Section title="② 供应商寻源" subtitle={`关键词「${sourcing.keyword_cn}」· ${sourcing.offers.length} 个候选`}>
          <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{sourcing.analysis}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sourcing.offers.slice(0, 6).map((o) => (
              <a
                key={o.offer_id}
                href={o.link}
                target="_blank"
                rel="noreferrer"
                className={`rounded-lg border p-3 text-xs transition hover:border-sky-500/60 ${
                  o.offer_id === sourcing.recommended_offer_id
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                {o.offer_id === sourcing.recommended_offer_id && (
                  <span className="mb-1 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    推荐
                  </span>
                )}
                <p className="line-clamp-2 text-slate-300">{o.title}</p>
                <p className="mt-1 text-slate-500">
                  ¥{o.price_cny ?? "—"} {o.seller && `· ${o.seller}`}
                </p>
              </a>
            ))}
          </div>
        </Section>
      )}

      {draft && (
        <Section title="③ 商品采集" subtitle={`${draft.skus.length} SKU · ${draft.images.length} 图`}>
          <p className="mb-2 text-xs text-slate-300">{draft.title_cn}</p>
          <p className="mb-3 text-xs text-slate-500">
            采购价 ¥{draft.price_cny ?? "—"} ·{" "}
            <a href={draft.source_link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
              货源链接
            </a>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {draft.images.slice(0, 6).map((u, i) => (
              <img key={i} src={u} alt="" className="h-20 w-20 shrink-0 rounded-md border border-slate-800 object-cover" />
            ))}
          </div>
        </Section>
      )}

      {pricing && (
        <Section title="④ 利润测算定价">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.plans.map((p) => (
              <div key={p.platform} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs">
                <p className="mb-1 font-semibold uppercase text-slate-300">{p.platform}</p>
                <p className="text-lg font-bold text-emerald-300">
                  {p.suggested_price} {p.currency}
                </p>
                <p className="text-slate-500">盈亏平衡 {p.breakeven_price} · 毛利 {p.gross_margin_pct}%</p>
                <div className="mt-2 space-y-0.5 text-slate-500">
                  {Object.entries(p.cost_breakdown).map(([k, v]) => (
                    <p key={k}>
                      {k}: {v}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{pricing.analysis}</p>
        </Section>
      )}

      {compliance && (
        <Section
          title="⑤ 合规审核"
          subtitle={`${compliance.passed ? "通过" : "存在 BLOCKER"}${compliance.hs_code_suggestion ? ` · HS Code ${compliance.hs_code_suggestion}` : ""}`}
        >
          <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{compliance.summary}</p>
          <div className="space-y-2">
            {compliance.issues.map((iss, i) => (
              <div key={i} className={`rounded-md border px-3 py-2 text-xs ${SEVERITY_STYLE[iss.severity] ?? SEVERITY_STYLE.info}`}>
                <span className="mr-2 font-semibold uppercase">{iss.severity}</span>
                <span className="mr-2 text-slate-400">[{iss.category}{iss.market && ` · ${iss.market}`}]</span>
                {iss.detail}
                {iss.suggestion && <p className="mt-1 text-slate-400">建议：{iss.suggestion}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {content && <ContentSection listings={content.listings} />}

      {images && (
        <Section title="⑦ 图片处理" subtitle={images.summary}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {images.tasks.map((t, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs">
                <img src={t.url} alt="" className="mb-2 h-28 w-full rounded object-cover" />
                <p className="text-slate-400">
                  <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase">{t.role}</span>
                  {t.issues.length > 0 ? t.issues.join("；") : "无问题"}
                </p>
                {t.actions.length > 0 && <p className="mt-1 text-amber-300/80">待处理：{t.actions.join("；")}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {packages && packages.length > 0 && (
        <Section title="⑧ 资料包组装" subtitle="即传即用上架资料包">
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((pkg) => (
              <div key={pkg.platform} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold uppercase text-slate-200">{pkg.platform}</span>
                  <span className="flex gap-2">
                    <a href={downloadUrl(pkg.platform, "json")} className="rounded bg-sky-500/15 px-2 py-1 text-sky-300 hover:bg-sky-500/25">
                      JSON
                    </a>
                    <a href={downloadUrl(pkg.platform, "xlsx")} className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300 hover:bg-emerald-500/25">
                      Excel
                    </a>
                  </span>
                </div>
                <ul className="space-y-1 text-slate-400">
                  {pkg.review_checklist.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function ContentSection({ listings }: { listings: { language: string; title: string; bullet_points: string[]; description: string; search_terms: string }[] }) {
  const [lang, setLang] = useState(listings[0]?.language ?? "en");
  const current = listings.find((l) => l.language === lang) ?? listings[0];
  if (!current) return null;
  return (
    <Section title="⑥ 多语言内容">
      <div className="mb-3 flex gap-2">
        {listings.map((l) => (
          <button
            key={l.language}
            onClick={() => setLang(l.language)}
            className={`rounded px-2.5 py-1 text-xs uppercase ${
              l.language === lang ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {l.language}
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm font-medium text-slate-200">{current.title}</p>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
        {current.bullet_points.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{current.description}</p>
      <p className="text-xs text-slate-500">搜索词：{current.search_terms}</p>
    </Section>
  );
}
