import { Injectable } from '@nestjs/common';

export type SchedulerRunRecord = {
  job: string;
  last_run_at: string;
  ok: boolean;
  message?: string;
};

@Injectable()
export class SchedulerHeartbeatService {
  private readonly runs = new Map<string, SchedulerRunRecord>();

  record(job: string, ok: boolean, message?: string) {
    this.runs.set(job, {
      job,
      last_run_at: new Date().toISOString(),
      ok,
      message,
    });
  }

  snapshot(): SchedulerRunRecord[] {
    return Array.from(this.runs.values()).sort((a, b) => a.job.localeCompare(b.job));
  }
}
