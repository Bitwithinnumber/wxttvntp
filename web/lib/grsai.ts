const GRSAI_BASE = process.env.GRSAI_BASE_URL || "https://grsai.dakka.com.cn";
const IMAGE_MODEL = process.env.GRSAI_IMAGE_MODEL || "gpt-image-2";

function grsaiKey() {
  const key = process.env.GRSAI_API_KEY;
  if (!key) throw new Error("缺少 GRSAI_API_KEY 环境变量");
  return key;
}

/** 提交 gpt-image-2 生成任务（webHook="-1" 立即返回 id），轮询 result 接口直至完成 */
export async function generateImage(opts: {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
}): Promise<string> {
  const res = await fetch(`${GRSAI_BASE}/v1/draw/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grsaiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio ?? "1024x1536",
      quality: "high",
      urls: opts.referenceImages ?? [],
      webHook: "-1",
      shutProgress: true,
    }),
  });
  if (!res.ok) throw new Error(`gpt-image-2 请求失败: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`gpt-image-2 提交失败: ${data.msg}`);
  const id: string = data.data.id;

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`${GRSAI_BASE}/v1/draw/result`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${grsaiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    if (!poll.ok) continue;
    const result = await poll.json();
    const d = result.data;
    if (!d) continue;
    if (d.status === "succeeded") {
      const url = d.results?.[0]?.url || d.url;
      if (!url) throw new Error("gpt-image-2 成功但未返回图片URL");
      return url;
    }
    if (d.status === "failed") {
      throw new Error(`gpt-image-2 生成失败: ${d.failure_reason} ${d.error}`);
    }
  }
  throw new Error("gpt-image-2 生成超时");
}

/** 下载远程图片转为 base64 data URL（grsai 图片链接2小时过期，转base64供Seedance使用） */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载图片失败: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}
