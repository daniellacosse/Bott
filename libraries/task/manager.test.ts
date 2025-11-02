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

import { assert, assertEquals, assertRejects } from "@std/assert";
import { delay } from "@std/async/delay";
import { TaskManager } from "./manager.ts";
import { createTask, type Task } from "./create.ts";
import { testHandler } from "@bott/logger";

// Helper function to create a versatile test task
const createTestTask = (
  taskName: string,
  executionTimeMs = 50,
  shouldFail = false,
  onStart?: () => void,
  onAbort?: () => void,
  onComplete?: () => void,
): Task => {
  return createTask(async (signal) => {
    onStart?.();

    // Promise that rejects when the task is aborted
    const abortPromise = new Promise<void>((_, reject) => {
      if (signal.aborted) {
        onAbort?.();
        reject(
          new DOMException("Task was aborted before starting.", "AbortError"),
        );
        return;
      }
      signal.addEventListener("abort", () => {
        onAbort?.();
        reject(
          new DOMException(
            `Task ${taskName} aborted during execution.`,
            "AbortError",
          ),
        );
      });
    });

    // Promise for the actual work
    const workPromise = async () => {
      await delay(executionTimeMs); // Simulate work
      if (signal.aborted) { // Check again after delay
        onAbort?.();
        throw new DOMException(
          `Task ${taskName} aborted post-delay.`,
          "AbortError",
        );
      }
      if (shouldFail) {
        throw new Error(`Task ${taskName} failed intentionally.`);
      }
      onComplete?.();
    };

    await Promise.race([workPromise(), abortPromise]);
  });
};

Deno.test("TaskManager - should add a bucket and execute a single task", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-single";
  let taskCompleted = false;
  const maxSwaps = 1;

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: maxSwaps, // Initial, but reset by logic
    config: { maximumSequentialSwaps: maxSwaps },
  });

  const task1 = createTestTask(
    "T1-single",
    30,
    false,
    undefined,
    undefined,
    () => {
      taskCompleted = true;
    },
  );
  manager.push(bucketName, task1);

  await delay(60); // Wait for task to complete

  assert(taskCompleted, "Task should have completed");
  const bucket = manager.buckets.get(bucketName);
  assertEquals(
    bucket?.current,
    undefined,
    "Current task should be undefined after completion",
  );
  assertEquals(bucket?.next, undefined, "Next task should be undefined");
  assertEquals(
    bucket?.remainingSwaps,
    maxSwaps,
    "Remaining swaps should reset",
  );
  assertEquals(
    bucket?.completions.length,
    1,
    "Task record should have one entry",
  );
});

Deno.test("TaskManager - should swap tasks, aborting the current one, and manage remainingSwaps", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-swap";
  let t1Aborted = false;
  let t2Completed = false;
  const maxSwaps = 2;

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: maxSwaps,
    config: { maximumSequentialSwaps: maxSwaps },
  });

  const task1 = createTestTask("T1-swap", 80, false, undefined, () => {
    t1Aborted = true;
  });
  const task2 = createTestTask(
    "T2-swap",
    40,
    false,
    undefined,
    undefined,
    () => {
      t2Completed = true;
    },
  );

  manager.push(bucketName, task1);
  await delay(10); // Ensure T1 starts

  const bucketAfterT1Start = manager.buckets.get(bucketName)!;
  assert(bucketAfterT1Start.current === task1, "T1 should be current");
  assertEquals(
    bucketAfterT1Start.remainingSwaps,
    maxSwaps,
    `Swaps should be ${maxSwaps} after T1 starts`,
  );

  manager.push(bucketName, task2); // Aborts T1, runs T2
  await delay(10); // Ensure T2 starts

  const bucketAfterT2Start = manager.buckets.get(bucketName)!;
  assert(bucketAfterT2Start.current === task2, "T2 should be current");
  assertEquals(
    bucketAfterT2Start.remainingSwaps,
    maxSwaps - 1,
    `Swaps should be ${maxSwaps - 1} after T2 swaps T1`,
  );

  await delay(100); // Wait for T2 to complete and T1 to process abort

  assert(t1Aborted, "Task T1 should have been aborted");
  assert(t2Completed, "Task T2 should have completed");

  const bucketPostT2Complete = manager.buckets.get(bucketName)!;
  assertEquals(bucketPostT2Complete.current, undefined);
  assertEquals(
    bucketPostT2Complete.remainingSwaps,
    maxSwaps,
    `Swaps should reset to ${maxSwaps}`,
  );
  assertEquals(bucketPostT2Complete.completions.length, 1);
});

Deno.test("TaskManager - should respect swap limit (maximumSequentialSwaps)", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-swap-limit";
  let t1Aborted = false;
  let t2Started = false;
  let t2Completed = false;
  let t3Started = false;
  let t3Completed = false;

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: 1,
    config: { maximumSequentialSwaps: 1 },
  });

  const task1 = createTestTask("T1-limit", 80, false, undefined, () => {
    t1Aborted = true;
  });
  const task2 = createTestTask(
    "T2-limit",
    40,
    false,
    () => {
      t2Started = true;
    },
    undefined,
    () => {
      t2Completed = true;
    },
  );
  const task3 = createTestTask(
    "T3-limit",
    40,
    false,
    () => {
      t3Started = true;
    },
    undefined,
    () => {
      t3Completed = true;
    },
  );

  manager.push(bucketName, task1);
  await delay(10); // T1 starts
  assertEquals(manager.buckets.get(bucketName)!.remainingSwaps, 1);

  manager.push(bucketName, task2); // Uses the 1 swap
  await delay(10); // T2 starts, T1 aborts
  assert(
    manager.buckets.get(bucketName)!.current === task2,
    "T2 should be current",
  );
  assert(t2Started, "T2 should have started");
  assertEquals(
    manager.buckets.get(bucketName)!.remainingSwaps,
    0,
    "Swaps should be 0",
  );

  manager.push(bucketName, task3); // Swap-blocked
  await delay(10);
  assert(
    manager.buckets.get(bucketName)!.current === task2,
    "T2 still current, T3 blocked",
  );
  assert(
    manager.buckets.get(bucketName)!.next === task3,
    "T3 should be in next",
  );
  assert(!t3Started, "T3 should not have started yet");

  await delay(50); // T2 should be complete, T3 should have started.
  assert(t1Aborted, "T1 should be aborted");
  assert(t2Completed, "T2 should have completed");

  // After T2 completes, T3 should start
  assert(
    manager.buckets.get(bucketName)!.current === task3,
    "T3 should now be current",
  );
  assert(t3Started, "T3 should have started");
  assertEquals(
    manager.buckets.get(bucketName)!.remainingSwaps,
    1,
    "Swaps should reset for T3",
  );

  await delay(80); // Wait for T3 to complete
  assert(t3Completed, "T3 should have completed");
  assertEquals(manager.buckets.get(bucketName)!.current, undefined);
  assertEquals(manager.buckets.get(bucketName)!.completions.length, 2);
});

Deno.test("TaskManager - should throttle tasks and clear record after window", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-throttle";
  const throttleLimit = 2;
  const throttleWindowMs = 100;

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: 1,
    config: {
      maximumSequentialSwaps: 1,
      throttle: { limit: throttleLimit, windowMs: throttleWindowMs },
    },
  });

  const taskNoOp = (name: string) => createTestTask(name, 5);

  manager.push(bucketName, taskNoOp("T1-throttle"));
  await delay(15);
  manager.push(bucketName, taskNoOp("T2-throttle"));
  await delay(15);
  assertEquals(
    manager.buckets.get(bucketName)!.completions.length,
    2,
    "Record: 2 after T1, T2",
  );

  let rejected = false;
  try {
    manager.push(bucketName, taskNoOp("T3-throttle"));
  } catch (e) {
    assertEquals((e as Error).message, "Too many requests");
    rejected = true;
  }
  assert(rejected, "T3 should be rejected by throttle");
  assertEquals(
    manager.buckets.get(bucketName)!.completions.length,
    2,
    "Record: still 2 after T3 rejection",
  );

  await delay(throttleWindowMs + 20); // Wait for T1, T2 records to become stale

  let t4ran = false;
  manager.push(
    bucketName,
    createTestTask("T4-throttle", 5, false, () => t4ran = true),
  );
  await delay(20); // Let T4 run
  assert(t4ran, "T4 should run after throttle window for T1, T2 expired");

  // When T4 is pushed, record is filtered. T1 and T2 are older than windowMs.
  assertEquals(
    manager.buckets.get(bucketName)!.completions.length,
    1,
    "Record should only contain T4",
  );
});

Deno.test("TaskManager - should handle task errors gracefully", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-error";
  const maxSwaps = 1;

  // Clear any previous test logs
  testHandler.clear();

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: maxSwaps,
    config: { maximumSequentialSwaps: maxSwaps },
  });

  const failingTask = createTestTask("T-fail", 20, true); // shouldFail = true
  manager.push(bucketName, failingTask);

  await delay(50); // Wait for task to fail

  const bucket = manager.buckets.get(bucketName)!;
  assertEquals(
    bucket.current,
    undefined,
    "Current task undefined after failure",
  );
  assertEquals(bucket.remainingSwaps, maxSwaps, "Swaps reset after failure");

  // Verify the warning was logged using the test handler
  const warningLogs = testHandler.logs.filter((log) =>
    log.msg.includes("Task failed:")
  );
  assert(warningLogs.length > 0, "Warning should have been logged");
  assert(
    warningLogs[0].msg.includes(bucketName),
    "Warning message should contain bucket name",
  );
});

Deno.test("TaskManager - push should throw if bucket does not exist", async () => {
  const manager = new TaskManager();
  const task = createTestTask("T-no-bucket", 10);
  await assertRejects(
    () => {
      try {
        manager.push("non-existent-bucket", task);
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve(); // assertRejects expects a promise
    },
    Error,
    "Channel not found",
  );
});

Deno.test("TaskManager - has should correctly report bucket existence", () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-has";

  assert(!manager.has(bucketName), "Should not have bucket before adding");
  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: 1,
    config: { maximumSequentialSwaps: 1 },
  });
  assert(manager.has(bucketName), "Should have bucket after adding");
});

Deno.test("TaskManager - should handle tasks pushed from another task's completion", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-recursive";
  let t1Completed = false;
  let t2Started = false;
  let t2Completed = false;

  const task2 = createTestTask(
    "T2-recursive",
    20,
    false,
    () => {
      t2Started = true;
    },
    undefined,
    () => {
      t2Completed = true;
    },
  );

  // Using raw createTask to embed manager.push in its completion logic
  const task1 = createTask(async (signal) => {
    await delay(20, { signal }); // Simulate T1 work
    t1Completed = true;
    manager.push(bucketName, task2); // Push T2 when T1 completes
  });

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: 1,
    config: { maximumSequentialSwaps: 1 },
  });

  manager.push(bucketName, task1);

  await delay(100); // Wait for both tasks

  assert(t1Completed, "T1 should complete");
  assert(t2Started, "T2 should start after T1 pushes it");
  assert(t2Completed, "T2 should complete");

  const bucket = manager.buckets.get(bucketName)!;
  assertEquals(
    bucket.current,
    undefined,
    "Current should be undefined after T2",
  );
  assertEquals(
    bucket.completions.length,
    2,
    "Record should have 2 entries (T1, T2)",
  );
});

Deno.test("TaskManager - tasks in next should run if current is undefined and no new task pushed", async () => {
  const manager = new TaskManager();
  const bucketName = "test-bucket-next-runs";
  let t1Started = false;
  let t1Completed = false;

  manager.add({
    name: bucketName,
    completions: [],
    remainingSwaps: 1,
    config: { maximumSequentialSwaps: 1 },
  });

  const task1 = createTestTask(
    "T1-next",
    30,
    false,
    () => {
      t1Started = true;
    },
    undefined,
    () => {
      t1Completed = true;
    },
  );

  // Manually set a task in 'next' and call flushTasks
  // This simulates a scenario where a task was previously in 'next'
  // and 'current' became undefined without an immediate new push.
  manager.buckets.get(bucketName)!.next = task1;
  // deno-lint-ignore no-explicit-any
  (manager as any).flushTasks(); // Access private method for testing this specific path

  await delay(60); // Wait for T1 to complete

  assert(t1Started, "T1 from next should have started");
  assert(t1Completed, "T1 from next should have completed");
  assertEquals(manager.buckets.get(bucketName)!.current, undefined);
  assertEquals(manager.buckets.get(bucketName)!.next, undefined);
});
