"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Job, Platform, VideoStyle } from "@/lib/types";
import { STYLE_TEMPLATES, PLATFORM_SPECS } from "@/lib/templates";

const STYLES = STYLE_TEMPLATES.map((t) => ({ id: t.id, name: t.name, desc: t.desc }));

export default function Home() {
  // -------- form state --------
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [style, setStyle] = useState<VideoStyle>("ugc_testimonial");
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [duration, setDuration] = useState(10);
  const [resolution, setResolution] = useState<"480p" | "720p">("720p");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [variantCount, setVariantCount] = useState(1);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // -------- job state --------
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // -------- image handling --------
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    setImageFiles(arr);
    setImagePreviews(arr.map((f) => URL.createObjectURL(f)));
  }, []);

  // -------- poll jobs --------
  const pollJobs = useCallback(async (ids: string[]) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`/api/jobs/${id}`);
        return r.ok ? ((await r.json()) as Job) : null;
      }),
    );
    setJobs(results.filter(Boolean) as Job[]);
    const allDone = results.every(
      (j) => j && (j.status === "succeeded" || j.status === "failed"),
    );
    if (allDone && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // -------- submit --------
  const handleSubmit = async () => {
    setError("");
    if (!productName.trim()) {
      setError("请输入商品名称");
      return;
    }
    setLoading(true);
    try {
      // 1. Upload images
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        const form = new FormData();
        for (const f of imageFiles) form.append("files", f);
        const upRes = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "上传失败");
        uploadedUrls = upData.urls;
      }

      // 2. Create generate jobs
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            productName,
            description,
            sellingPoints,
            targetAudience,
            platform,
            style,
            language,
            duration,
            resolution,
            generateAudio,
          },
          productImageUrls: uploadedUrls,
          variantCount,
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "生成失败");
      const ids: string[] = genData.jobIds;

      // 3. Start polling
      await pollJobs(ids);
      pollRef.current = setInterval(() => pollJobs(ids), 5000);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedStyleDesc = STYLES.find((s) => s.id === style)?.desc ?? "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">
          <span className="text-[var(--accent)]">爆款视频</span>工厂
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          上传商品图 → AI 一键生成 TikTok / Facebook 仿UGC爆款视频
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* ---------- LEFT: Form ---------- */}
        <section className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-lg font-semibold">① 商品信息</h2>

          <label className="block">
            <span className="text-sm text-neutral-300">商品名称 *</span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="例：日本进口氨基酸洗面奶"
            />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">商品描述</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述商品特征、材质、功能等"
            />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">核心卖点</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              rows={2}
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              placeholder="例：氨基酸温和配方、深层清洁不紧绷、控油12小时"
            />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">目标人群</span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例：18-30岁女性，油皮、混油皮"
            />
          </label>

          {/* Image upload */}
          <div>
            <span className="text-sm text-neutral-300">商品图片（最多5张）</span>
            <div
              className="mt-2 flex min-h-[120px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-800/50 transition hover:border-[var(--accent)]"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreviews.length === 0 ? (
                <p className="text-sm text-neutral-500">点击或拖放上传商品图</p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3">
                  {imagePreviews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`preview-${i}`}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <h2 className="text-lg font-semibold">② 视频设定</h2>

          {/* Platform */}
          <div className="flex gap-3">
            {(["tiktok", "facebook"] as Platform[]).map((p) => (
              <button
                key={p}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  platform === p
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
                onClick={() => setPlatform(p)}
              >
                {PLATFORM_SPECS[p].name}
              </button>
            ))}
          </div>

          {/* Style */}
          <label className="block">
            <span className="text-sm text-neutral-300">爆款模板</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              value={style}
              onChange={(e) => setStyle(e.target.value as VideoStyle)}
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">{selectedStyleDesc}</p>
          </label>

          {/* Language */}
          <div className="flex gap-3">
            {[
              { v: "zh" as const, label: "中文" },
              { v: "en" as const, label: "English" },
            ].map(({ v, label }) => (
              <button
                key={v}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  language === v
                    ? "border-[var(--accent2)] bg-[var(--accent2)]/10 text-[var(--accent2)]"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
                onClick={() => setLanguage(v)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Duration / Resolution / Audio */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-neutral-400">视频时长（秒）</span>
              <input
                type="number"
                min={4}
                max={12}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-xs text-neutral-400">分辨率</span>
              <select
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as "480p" | "720p")}
              >
                <option value="720p">720p</option>
                <option value="480p">480p（快速）</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(e) => setGenerateAudio(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-neutral-400">生成配音</span>
            </label>
          </div>

          {/* Variant count */}
          <label className="block">
            <span className="text-xs text-neutral-400">批量生成数量（1-5）</span>
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              value={variantCount}
              onChange={(e) => setVariantCount(Math.min(5, Math.max(1, Number(e.target.value))))}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-pink-600 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "提交中…" : "🚀 一键生成爆款视频"}
          </button>
        </section>

        {/* ---------- RIGHT: Results ---------- */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">③ 生成结果</h2>

          {jobs.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60">
              <p className="text-sm text-neutral-500">填写左侧信息开始生成…</p>
            </div>
          )}

          {jobs.map((job, idx) => (
            <div
              key={job.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  方案 {idx + 1}
                </span>
                <StatusBadge status={job.status} />
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">{job.statusText}</p>
              </div>

              {/* Script */}
              {job.plan && (
                <details className="mb-3">
                  <summary className="cursor-pointer text-sm text-[var(--accent2)]">
                    查看创意脚本
                  </summary>
                  <div className="mt-2 space-y-2 text-xs text-neutral-300">
                    <p>
                      <strong>钩子：</strong>
                      {job.plan.hook}
                    </p>
                    <pre className="whitespace-pre-wrap rounded bg-neutral-800 p-2">
                      {job.plan.script}
                    </pre>
                    <p>
                      <strong>发布文案：</strong>
                      {job.plan.caption}
                    </p>
                    <p>
                      <strong>标签：</strong>
                      {job.plan.hashtags?.join(" ")}
                    </p>
                  </div>
                </details>
              )}

              {/* First frame */}
              {job.firstFrameUrl && (
                <div className="mb-3">
                  <p className="mb-1 text-xs text-neutral-400">首帧图</p>
                  <img
                    src={job.firstFrameUrl}
                    alt="首帧"
                    className="h-48 w-auto rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Video */}
              {job.videoUrl && (
                <div>
                  <p className="mb-1 text-xs text-neutral-400">生成视频</p>
                  <video
                    src={job.videoUrl}
                    controls
                    className="w-full max-w-xs rounded-lg"
                    poster={job.firstFrameUrl}
                  />
                  <a
                    href={job.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[var(--accent2)] underline"
                  >
                    下载视频
                  </a>
                </div>
              )}

              {job.error && <p className="text-xs text-red-400">{job.error}</p>}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-neutral-700 text-neutral-300",
    planning: "bg-blue-900/60 text-blue-300",
    generating_image: "bg-purple-900/60 text-purple-300",
    generating_video: "bg-orange-900/60 text-orange-300",
    succeeded: "bg-green-900/60 text-green-300",
    failed: "bg-red-900/60 text-red-300",
  };
  const labels: Record<string, string> = {
    pending: "排队中",
    planning: "生成脚本",
    generating_image: "生成图片",
    generating_video: "生成视频",
    succeeded: "完成",
    failed: "失败",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
