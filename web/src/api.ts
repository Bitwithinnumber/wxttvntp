import type { NodeInfo, PipelineStatus } from "./types";

const BASE = "/api";

export async function fetchNodes(): Promise<NodeInfo[]> {
  const r = await fetch(`${BASE}/nodes`);
  if (!r.ok) throw new Error(`GET /nodes ${r.status}`);
  return r.json();
}

export interface StartParams {
  keyword: string;
  keyword_cn: string;
  marketplace: string;
  target_platforms: string[];
  target_languages: string[];
  shipping_cny: number;
  target_margin: number;
  thread_id?: string;
}

export async function startPipeline(params: StartParams): Promise<{ thread_id: string }> {
  const r = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`POST /pipeline ${r.status}`);
  return r.json();
}

export async function fetchStatus(threadId: string): Promise<PipelineStatus> {
  const r = await fetch(`${BASE}/pipeline/${threadId}`);
  if (!r.ok) throw new Error(`GET /pipeline/${threadId} ${r.status}`);
  return r.json();
}

export function downloadUrl(platform: string, fmt: "json" | "xlsx"): string {
  return `${BASE}/download/${platform}/${fmt}`;
}
