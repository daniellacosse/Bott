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
  completions: Date[];
  config: {
    throttle?: {
      windowMs: number;
      limit: number;
    };
    maximumSequentialSwaps: number;
  };
};

type TaskBucketMap = Map<TaskBucketName, TaskBucket>;

// TODO(#44): instantiate TaskManager with prior runs,
// persisting rate limit across deploys
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

      bucket.completions = bucket.completions.filter((timestamp) =>
        (timestamp.valueOf() + bucket.config.throttle!.windowMs) > nowMs
      );

      if (bucket.completions.length >= bucket.config.throttle!.limit) {
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
        continue;
      }

      const currentTask = bucket.current;
      const newTask = bucket.next;

      if (currentTask && bucket.remainingSwaps >= 1) {
        console.debug(
          "[DEBUG] Replacing current task:",
          bucket.name,
          `${currentTask.nonce} -> ${newTask.nonce}`,
        );
        currentTask.controller.abort();

        bucket.remainingSwaps--;
        bucket.current = undefined;
      }

      if (!bucket.current) {
        bucket.current = newTask;
        bucket.next = undefined;

        console.debug(
          "[DEBUG] Starting new task:",
          `${bucket.name}:${newTask.nonce}`,
        );

        (async () => {
          try {
            await newTask(newTask.controller.signal);
            bucket.remainingSwaps = bucket.config.maximumSequentialSwaps;
            bucket.completions.push(new Date());
            console.debug(
              "[DEBUG] Task completed:",
              `${bucket.name}:${newTask.nonce}`,
            );
          } catch (error) {
            if (
              (error as Error).name === "AbortError" ||
              (error as Error).message.includes("AbortError")
            ) {
              console.warn(
                "[WARN] Task aborted:",
                `${bucket.name}:${newTask.nonce}`,
              );
            } else {
              console.warn(
                "[WARN] Task failed:",
                `${bucket.name}:${newTask.nonce}`,
                error,
              );
            }
          } finally {
            if (bucket.current === newTask) {
              bucket.current = undefined;
            }

            this.flushTasks();
          }
        })();
      }
    }

    // Display currently running/idle tasks:
    const runningTasks = [];
    const idleTasks = [];

    for (const bucket of this.buckets.values()) {
      if (bucket.current) {
        let taskString = `${bucket.name}:${bucket.current?.nonce}`;

        if (!bucket.remainingSwaps) {
          taskString += " (LOCKED)";
        } else {
          taskString += ` (swaps: ${bucket.remainingSwaps})`;
        }

        runningTasks.push(taskString);
      }

      if (bucket.next) {
        idleTasks.push(`${bucket.name}:${bucket.next?.nonce}`);
      }
    }

    console.debug("[DEBUG] Task manager status:", {
      running: runningTasks,
      idle: idleTasks,
      totalCompletions: this.buckets.values().reduce((sum, bucket) => {
        return sum + bucket.completions.length;
      }, 0),
    });

    this.isFlushing = false;
  }
}
