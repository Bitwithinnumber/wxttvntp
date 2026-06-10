import type { Job, JobStatus } from "./types";

/** In-memory job store (good enough for a single-process demo) */
const store = new Map<string, Job>();

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function listJobs(): Job[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function createJob(job: Job): void {
  store.set(job.id, job);
}

export function updateJob(id: string, patch: Partial<Job>): Job {
  const job = store.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}

export function setJobStatus(id: string, status: JobStatus, statusText: string, progress: number) {
  updateJob(id, { status, statusText, progress });
}
