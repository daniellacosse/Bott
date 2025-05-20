import type { Task } from "./create.ts";

type TaskBucketName = string;

type TaskBucket = {
  name: TaskBucketName;
  current?: Task;
  next?: Task;
  remainingSwaps: number;
  config: {
    maximumSequentialSwaps: number;
  };
};

type TaskBucketMap = Map<TaskBucketName, TaskBucket>;

export class TaskManager {
  // taskTypeThrottler: TaskThrottler;
  buckets: TaskBucketMap = new Map();
  private isFlushing = false;

  // constructor(throttler: TaskThrottler) {
  //   this.taskTypeThrottler = throttler;
  // }

  push(name: TaskBucketName, task: Task) {
    if (!this.buckets.has(name)) {
      throw new Error("Channel not found");
    }

    this.buckets.get(name)!.next = task;

    this.flushTasks();
  }

  has(name: TaskBucketName) {
    return this.buckets.has(name);
  }

  add(channel: TaskBucket) {
    this.buckets.set(channel.name, channel);

    this.flushTasks();
  }

  private async flushTasks() {
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    for (const bucket of this.buckets.values()) {
      if (!bucket.next) {
        console.debug("[DEBUG] No next task:", bucket.name);
        continue;
      }

      if (!bucket.current || bucket.remainingSwaps > 0) {
        console.debug(
          "[DEBUG] Loading new task:",
          bucket.name,
          bucket.next.nonce,
        );
        const previous = bucket.current;

        bucket.current = bucket.next;
        bucket.next = undefined;

        if (previous && bucket.remainingSwaps > 0) {
          console.debug(
            "[DEBUG] Aborting previous task:",
            bucket.name,
            previous.nonce,
          );
          previous.controller.abort();
          bucket.remainingSwaps--;
        }
      }

      // if (
      //   !(channel.current &&
      //     this.taskTypeThrottler.canRun(channel.current.type))
      // ) {
      //   console.debug(
      //     "[DEBUG] Throttled task of type:",
      //     channel.name,
      //     channel.current.type,
      //     channel.current.nonce,
      //   );
      //   continue;
      // }

      if (bucket.remainingSwaps < 0) {
        console.debug(
          "[DEBUG] Swap-blocked task:",
          bucket.name,
          bucket.current?.nonce,
        );
        continue;
      }

      console.debug(
        "[DEBUG] Starting task:",
        bucket.name,
        bucket.current?.nonce,
      );

      // We have to wrap this in a function so we can handle errors
      // without holding up the loop.
      this.runCurrentTaskImmediately(bucket);
    }

    this.isFlushing = false;
  }

  private async runCurrentTaskImmediately(bucket: TaskBucket) {
    try {
      await bucket.current!(bucket.current!.controller.signal);
    } catch (error) {
      console.warn(
        "[WARN] Task failed or aborted:",
        bucket.name,
        bucket.current!.nonce,
        (error as Error).message,
      );
    } finally {
      // this.taskTypeThrottler?.recordRun(channel.current!.type);

      bucket.current = undefined;
      bucket.remainingSwaps = bucket.config.maximumSequentialSwaps;

      this.flushTasks();
    }
  }
}
