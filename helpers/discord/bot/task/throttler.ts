export class TaskThrottler {
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
   * Whether the task of the given type is permitted to run.
   */
  canRun(taskType: string): boolean {
    const nowMs = Date.now().valueOf();
    const timestamps = this.taskRecord[taskType];

    if (!timestamps) {
      return true;
    }

    this.taskRecord[taskType] = timestamps.filter((timestamp) =>
      (timestamp.valueOf() + this.throttleWindowMs) > nowMs
    );

    return this.taskRecord[taskType].length < this.maxTaskCount;
  }

  /**
   * Records a run of the task type.
   */
  recordRun(taskType: string) {
    if (!this.taskRecord[taskType]) {
      this.taskRecord[taskType] = [new Date()];
    } else {
      this.taskRecord[taskType].push(new Date());
    }
  }
}
