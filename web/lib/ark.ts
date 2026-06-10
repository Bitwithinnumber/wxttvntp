const ARK_BASE = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const LLM_MODEL = process.env.ARK_LLM_MODEL || "doubao-seed-1-6-250615";
const VIDEO_MODEL = process.env.ARK_VIDEO_MODEL || "doubao-seedance-2-0-fast-260128";

function arkKey() {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("缺少 ARK_API_KEY 环境变量");
  return key;
}

export async function chatJSON<T>(system: string, user: string): Promise<T> {
  const res = await fetch(`${ARK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${arkKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "enabled" },
      max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`豆包 LLM 请求失败: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const jsonText = content.replace(/^```json?\s*|```\s*$/g, "").trim();
  return JSON.parse(jsonText) as T;
}

interface SeedanceContentItem {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
  role?: "first_frame" | "last_frame" | "reference_image";
}

export async function createVideoTask(opts: {
  prompt: string;
  firstFrame?: string;
  referenceImages?: string[];
  ratio: string;
  duration: number;
  resolution: string;
  generateAudio: boolean;
}): Promise<string> {
  const content: SeedanceContentItem[] = [
    {
      type: "text",
      text: `${opts.prompt} --ratio ${opts.ratio} --resolution ${opts.resolution} --duration ${opts.duration} --watermark false`,
    },
  ];
  if (opts.firstFrame) {
    content.push({ type: "image_url", image_url: { url: opts.firstFrame }, role: "first_frame" });
  }
  for (const url of opts.referenceImages ?? []) {
    content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  }
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${arkKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VIDEO_MODEL,
      content,
      generate_audio: opts.generateAudio,
    }),
  });
  if (!res.ok) throw new Error(`Seedance 创建任务失败: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

export async function getVideoTask(taskId: string): Promise<{
  status: string;
  videoUrl?: string;
  error?: string;
}> {
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${arkKey()}` },
  });
  if (!res.ok) throw new Error(`Seedance 查询任务失败: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    status: data.status,
    videoUrl: data.content?.video_url,
    error: data.error?.message,
  };
}
