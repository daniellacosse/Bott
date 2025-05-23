import type { Task } from "./create.ts";

type TaskBucketName = string;

type TaskBucket = {
  name: TaskBucketName;
  current?: Task;
  next?: Task;
  remainingSwaps: number;
  record: Date[];
  config: {
    throttle?: {
      windowMs: number;
      limit: number;
    };
    maximumSequentialSwaps: number;
  };
};

type TaskBucketMap = Map<TaskBucketName, TaskBucket>;

export class TaskManager {
  buckets: TaskBucketMap = new Map();
  private isFlushing = false;

  push(name: TaskBucketName, task: Task) {
    if (!this.buckets.has(name)) {
      throw new Error("Channel not found");
    }

    const bucket = this.buckets.get(name)!;

    if (bucket.config.throttle) {}

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

  private flushTasks() {
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    for (const bucket of this.buckets.values()) {
      if (!bucket.next) {
        console.debug("[DEBUG] No new task:", bucket.name);
        continue;
      }

      const oldTask = bucket.current;
      const newTask = bucket.next;

      if (!oldTask) {
        bucket.remainingSwaps = bucket.config.maximumSequentialSwaps;
        console.debug(
          "[DEBUG] Loading new task:",
          bucket.name,
          newTask.nonce,
        );
        bucket.current = newTask;
        bucket.next = undefined;
      } else {
        if (bucket.remainingSwaps >= 1) {
          console.debug(
            "[DEBUG] Aborting old task:",
            bucket.name,
            oldTask.nonce,
          );
          oldTask.controller.abort();
          bucket.remainingSwaps--;

          console.debug(
            "[DEBUG] Loading new task:",
            bucket.name,
            newTask.nonce,
          );
          bucket.current = newTask;
          bucket.next = undefined;
        } else {
          console.debug(
            "[DEBUG] Swap-blocked new task:",
            bucket.name,
            newTask.nonce,
          );
          continue;
        }
      }

      console.debug(
        "[DEBUG] Starting new task:",
        bucket.name,
        newTask.nonce,
      );

      newTask(newTask.controller.signal)
        .catch((error: Error) => {
          console.warn(
            "[WARN] Task aborted:",
            bucket.name,
            newTask.nonce,
            { message: error.message },
          );
        })
        .finally(() => {
          console.debug(
            "[DEBUG] Task finished:",
            bucket.name,
            newTask.nonce,
          );

          bucket.current = undefined;
          bucket.remainingSwaps = bucket.config.maximumSequentialSwaps;

          this.flushTasks();
        });
    }

    this.isFlushing = false;
  }
}
