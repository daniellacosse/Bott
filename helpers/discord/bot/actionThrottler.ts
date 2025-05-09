export class ActionThrottler {
  throttleWindowMs: number;
  maxActionCount: number;
  actionRecord: Record<string, Date[]>;

  constructor(
    throttleWindowMs: number,
    maxActionCount: number,
    actionRecord?: Record<string, Date[]>,
  ) {
    this.throttleWindowMs = throttleWindowMs;
    this.maxActionCount = maxActionCount;
    this.actionRecord = actionRecord ?? {};
  }

  canTakeCation(actionId: string): boolean {
    const nowMs = Date.now().valueOf();
    const timestamps = this.actionRecord[actionId];

    if (!timestamps) {
      return true;
    }

    this.actionRecord[actionId] = timestamps.filter((timestamp) =>
      (timestamp.valueOf() + this.throttleWindowMs) > nowMs
    );

    return this.actionRecord[actionId].length < this.maxActionCount;
  }

  attemptAction(actionName: string): boolean {
    if (!this.canTakeCation(actionName)) {
      return false;
    }

    if (!this.actionRecord[actionName]) {
      this.actionRecord[actionName] = [new Date()];
    } else {
      this.actionRecord[actionName].push(new Date());
    }

    return true;
  }
}
