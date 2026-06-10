import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import type { CreativePlan, Job, ProductInput } from "@/lib/types";
import { chatJSON } from "@/lib/ark";
import { generateImage } from "@/lib/grsai";
import { createVideoTask, getVideoTask } from "@/lib/ark";
import { createJob, setJobStatus, updateJob } from "@/lib/jobs";
import { buildScriptSystemPrompt, buildScriptUserPrompt } from "@/lib/prompts";
import { PLATFORM_SPECS } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input,
      productImageUrls,
      variantCount = 1,
    }: { input: ProductInput; productImageUrls: string[]; variantCount?: number } = body;

    if (!input?.productName) {
      return NextResponse.json({ error: "缺少商品名称" }, { status: 400 });
    }

    const jobs: string[] = [];

    for (let v = 0; v < Math.min(variantCount, 5); v++) {
      const id = randomUUID();
      const job: Job = {
        id,
        status: "pending",
        progress: 0,
        statusText: "排队中…",
        input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      createJob(job);
      jobs.push(id);

      runPipeline(id, input, productImageUrls, v + 1, variantCount).catch((err) => {
        updateJob(id, {
          status: "failed",
          statusText: `失败: ${String(err).slice(0, 200)}`,
          error: String(err),
        });
      });
    }

    return NextResponse.json({ jobIds: jobs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function runPipeline(
  id: string,
  input: ProductInput,
  imageUrls: string[],
  variantIdx: number,
  variantTotal: number,
) {
  // ---------- Phase 1: LLM Script Generation ----------
  setJobStatus(id, "planning", `[${variantIdx}/${variantTotal}] 豆包 LLM 正在生成创意脚本…`, 10);

  const system = buildScriptSystemPrompt();
  const user = buildScriptUserPrompt(input, 1);
  const result = await chatJSON<{ variants: CreativePlan[] }>(system, user);
  const plan = result.variants?.[0];
  if (!plan) throw new Error("LLM 未返回有效创意方案");

  updateJob(id, { plan, progress: 30, statusText: "脚本生成完成，正在生成首帧图片…" });

  // ---------- Phase 2: First-frame image (gpt-image-2) ----------
  setJobStatus(id, "generating_image", "gpt-image-2 正在生成首帧图片…", 35);

  const fullImgUrls = imageUrls
    .map((u) => (u.startsWith("http") ? u : `${process.env.PUBLIC_BASE_URL || ""}${u}`))
    .filter(Boolean);

  const firstFrameUrl = await generateImage({
    prompt: plan.firstFramePrompt,
    referenceImages: fullImgUrls,
    aspectRatio: "1024x1536",
  });
  updateJob(id, { firstFrameUrl, progress: 55, statusText: "首帧生成完成，正在生成视频…" });

  // ---------- Phase 3: Seedance 2.0 Fast Video ----------
  setJobStatus(id, "generating_video", "Seedance 2.0 Fast 正在生成视频…", 60);

  const platform = PLATFORM_SPECS[input.platform];
  const taskId = await createVideoTask({
    prompt: plan.videoPrompt,
    firstFrame: firstFrameUrl,
    referenceImages: fullImgUrls,
    ratio: platform.ratio,
    duration: input.duration,
    resolution: input.resolution,
    generateAudio: input.generateAudio,
  });

  // Poll seedance
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 8000));
    const task = await getVideoTask(taskId);
    if (task.status === "succeeded" && task.videoUrl) {
      updateJob(id, {
        status: "succeeded",
        videoUrl: task.videoUrl,
        progress: 100,
        statusText: "视频生成完成！",
      });
      return;
    }
    if (task.status === "failed") {
      throw new Error(`Seedance 失败: ${task.error}`);
    }
    // still running
    setJobStatus(id, "generating_video", `Seedance 生成中（${task.status}）…`, 65);
  }
  throw new Error("Seedance 视频生成超时（10分钟）");
}
