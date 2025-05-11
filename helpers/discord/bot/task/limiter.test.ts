import { TaskLimiter } from "./limiter.ts";
import { assertEquals } from "jsr:@std/assert";
import { delay } from "jsr:@std/async/delay";

Deno.test("TaskThrottler - canRun initially true", () => {
  const throttler = new TaskLimiter(1000, 3);
  assertEquals(throttler.canRun("task1"), true);
});

Deno.test("TaskThrottler - canRun after recording within limit", () => {
  const throttler = new TaskLimiter(1000, 3);
  throttler.recordRun("task1");
  throttler.recordRun("task1");
  assertEquals(throttler.canRun("task1"), true);
  assertEquals(throttler.taskRecord["task1"].length, 2);
});

Deno.test("TaskThrottler - canRun false when limit reached", () => {
  const throttler = new TaskLimiter(1000, 2);
  throttler.recordRun("task1");
  throttler.recordRun("task1");
  assertEquals(throttler.canRun("task1"), false);
  assertEquals(throttler.taskRecord["task1"].length, 2);
});

Deno.test("TaskThrottler - canRun false when attempting to exceed limit", () => {
  const throttler = new TaskLimiter(1000, 1);
  throttler.recordRun("task1");
  assertEquals(throttler.canRun("task1"), false);

  throttler.recordRun("task1");
  assertEquals(throttler.canRun("task1"), false);
  assertEquals(throttler.taskRecord["task1"].length, 2); // because recordRun was called twice
});

Deno.test("TaskThrottler - canRun true after window expiration", async () => {
  const windowMs = 100;
  const maxTasks = 2;
  const throttler = new TaskLimiter(windowMs, maxTasks);

  throttler.recordRun("task1");
  throttler.recordRun("task1");
  assertEquals(
    throttler.canRun("task1"),
    false,
    "Should be false immediately after reaching limit",
  );

  await delay(windowMs + 50); // Wait for window to expire

  assertEquals(
    throttler.canRun("task1"),
    true,
    "Should be true after window expires",
  );
  // After canRun, the expired tasks should be filtered out
  assertEquals(
    throttler.taskRecord["task1"]?.length,
    0,
    "Expired tasks should be cleared",
  );
});

Deno.test("TaskThrottler - partial window expiration", async () => {
  const windowMs = 200;
  const maxTasks = 3;
  const throttler = new TaskLimiter(windowMs, maxTasks);

  // Record 2 tasks
  throttler.recordRun("task1"); // t0
  throttler.recordRun("task1"); // t0 + ~0ms

  await delay(windowMs / 2 + 10); // Wait for a bit more than half the window

  // Record 1 more task
  throttler.recordRun("task1"); // t0 + windowMs/2 + 10ms

  // At this point, we have 3 tasks, all within the window relative to the *last* task.
  // But the first two are older.
  assertEquals(
    throttler.canRun("task1"),
    false,
    "Should be false, 3 tasks recorded",
  );
  assertEquals(throttler.taskRecord["task1"].length, 3);

  // Wait for the first two tasks to expire
  await delay(windowMs / 2 + 50); // Total delay > windowMs from the first tasks

  // Now, the first two tasks should be expired, leaving only the third one.
  assertEquals(
    throttler.canRun("task1"),
    true,
    "Should be true as first 2 tasks expired",
  );
  assertEquals(
    throttler.taskRecord["task1"]?.length,
    1,
    "Only one recent task should remain",
  );
});

Deno.test("TaskThrottler - independent task IDs", () => {
  const throttler = new TaskLimiter(1000, 1);

  throttler.recordRun("task1");
  assertEquals(throttler.canRun("task1"), false, "task1 should be throttled");
  assertEquals(throttler.canRun("task2"), true, "task2 should not be affected");

  throttler.recordRun("task2");
  assertEquals(
    throttler.canRun("task2"),
    false,
    "task2 should now be throttled",
  );
  assertEquals(throttler.taskRecord["task1"].length, 1);
  assertEquals(throttler.taskRecord["task2"].length, 1);
});
