export class TaskLimiter {
  throttleWindowMs: number;
  maxTaskCount: number;
  taskRecord: Record<string, Date[]> = {};

  constructor(
    throttleWindowMs: number,
    maxTaskCount: number,
  ) {
    this.throttleWindowMs = throttleWindowMs;
    this.maxTaskCount = maxTaskCount;
  }

  /**
   * Whether the task of the given id is permitted to run.
   */
  canRun(taskId: string): boolean {
    const nowMs = Date.now().valueOf();
    const timestamps = this.taskRecord[taskId];

    if (!timestamps) {
      return true;
    }

    this.taskRecord[taskId] = timestamps.filter((timestamp) =>
      (timestamp.valueOf() + this.throttleWindowMs) > nowMs
    );

    return this.taskRecord[taskId].length < this.maxTaskCount;
  }

  /**
   * Records a run of the taskId.
   */
  recordRun(taskId: string) {
    if (!this.taskRecord[taskId]) {
      this.taskRecord[taskId] = [new Date()];
    } else {
      this.taskRecord[taskId].push(new Date());
    }
  }
}
