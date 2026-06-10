export type Platform = "tiktok" | "facebook";

export type VideoStyle =
  | "ugc_testimonial"
  | "unboxing"
  | "problem_solution"
  | "before_after"
  | "lifestyle"
  | "asmr_showcase";

export interface ProductInput {
  productName: string;
  description: string;
  sellingPoints: string;
  targetAudience: string;
  platform: Platform;
  style: VideoStyle;
  language: "zh" | "en";
  duration: number;
  resolution: "480p" | "720p";
  generateAudio: boolean;
}

export interface CreativePlan {
  hook: string;
  script: string;
  videoPrompt: string;
  firstFramePrompt: string;
  caption: string;
  hashtags: string[];
}

export type JobStatus =
  | "pending"
  | "planning"
  | "generating_image"
  | "generating_video"
  | "succeeded"
  | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  statusText: string;
  input: ProductInput;
  plan?: CreativePlan;
  firstFrameUrl?: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
