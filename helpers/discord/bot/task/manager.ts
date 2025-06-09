/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

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

    if (bucket.config.throttle) {
      const nowMs = Date.now();

      bucket.record = bucket.record.filter((timestamp) =>
        (timestamp.valueOf() + bucket.config.throttle!.windowMs) > nowMs
      );

      if (bucket.record.length >= bucket.config.throttle!.limit) {
        throw new Error("Too many requests");
      }
    }

    this.buckets.get(name)!.next = task;

    this.flushTasks();
  }

  has(name: TaskBucketName): boolean {
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

      bucket.record.push(new Date());

      newTask(newTask.controller.signal)
        .catch((error: Error) => {
          console.warn(
            "[WARN] Task aborted:",
            bucket.name,
            newTask.nonce,
            { error },
          );
        })
        .finally(() => {
          console.debug(
            "[DEBUG] Task finished:",
            bucket.name,
            newTask.nonce,
          );

          // Only modify the bucket's state if this task (newTask) is still
          // the one considered current. This prevents a task that was swapped out
          // from incorrectly clearing the state of the task that replaced it.
          if (bucket.current === newTask) {
            bucket.current = undefined;
            bucket.remainingSwaps = bucket.config.maximumSequentialSwaps;
          }

          this.flushTasks();
        });
    }

    this.isFlushing = false;
  }
}
