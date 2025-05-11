import { SwapTaskQueue } from "./queue.ts";
import { assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { assert, assertEquals } from "jsr:@std/assert";
import { delay } from "jsr:@std/async/delay";

const DEFAULT_INITIAL_SWAPS = 6;

Deno.test("SwapTaskQueue - single task execution", async () => {
  const queue = new SwapTaskQueue();
  const taskSpy = spy(
    (_signal: AbortSignal) => Promise.resolve(),
  );

  queue.push(1, taskSpy);
  await delay(10); // Allow microtasks to settle

  assertSpyCalls(taskSpy, 1);
});

Deno.test("SwapTaskQueue - task swapping and abort", async () => {
  const queue = new SwapTaskQueue();
  let firstTaskAborted = false;

  const firstTask = spy(async (signal: AbortSignal) => {
    signal.onabort = () => {
      firstTaskAborted = true;
    };
    await delay(100); // Simulate work
    if (signal.aborted) {
      return;
    }
    throw new Error("First task should have been aborted");
  });

  const secondTask = spy(
    (_signal: AbortSignal) => Promise.resolve(),
  );

  queue.push(1, firstTask);
  await delay(10); // Ensure first task starts
  queue.push(1, secondTask);
  await delay(50); // Allow second task to execute

  assert(firstTaskAborted, "First task was not aborted");
  assertSpyCalls(firstTask, 1);
  assertSpyCalls(secondTask, 1);

  // Check remainingSwaps (indirectly, by trying to swap again)
  // @ts-ignore: access private member for test
  const job = queue.readyJobs.get(1) ?? queue.blockedJobs.get(1);
  assertEquals(job?.remainingSwaps, DEFAULT_INITIAL_SWAPS - 1);
});

Deno.test("SwapTaskQueue - swap limit and blocking", async () => {
  const queue = new SwapTaskQueue();
  const taskPromises: Promise<void>[] = [];
  const taskSpies = [];

  let liveTaskCompleter: () => void = () => {};

  for (let i = 0; i < DEFAULT_INITIAL_SWAPS; i++) {
    const task = spy(async (signal: AbortSignal) => {
      // The last one before blocking will be the "live" one
      if (i === DEFAULT_INITIAL_SWAPS - 1) {
        await new Promise<void>((resolve) => {
          liveTaskCompleter = resolve;
        });
      } else {
        // Other tasks should be aborted quickly
        await delay(50);
        if (signal.aborted) return;
        throw new Error(`Task ${i} should have been aborted`);
      }
    });
    taskSpies.push(task);
    queue.push(1, task);
    await delay(5); // Stagger pushes
  }

  const blockedTaskSpy = spy(
    (_signal: AbortSignal) => Promise.resolve(),
  );
  queue.push(1, blockedTaskSpy); // This one should be blocked

  await delay(60); // Allow aborts to propagate

  // Verify earlier tasks were called (and implicitly aborted)
  for (let i = 0; i < DEFAULT_INITIAL_SWAPS - 1; i++) {
    assertSpyCalls(taskSpies[i], 1);
  }
  // Live task is called
  assertSpyCalls(taskSpies[DEFAULT_INITIAL_SWAPS - 1], 1);
  // Blocked task not yet called
  assertSpyCalls(blockedTaskSpy, 0);

  // @ts-ignore: access private member for test
  assert(queue.blockedJobs.has(1), "Job should be in blockedJobs");
  // @ts-ignore: access private member for test
  assertEquals(queue.blockedJobs.get(1)!.task, blockedTaskSpy);

  // Complete the live task
  liveTaskCompleter();
  await delay(10); // Allow blocked task to be promoted and run

  assertSpyCalls(blockedTaskSpy, 1);
  // @ts-ignore: access private member for test
  assert(!queue.blockedJobs.has(1), "Job should not be in blockedJobs anymore");
  // @ts-ignore: access private member for test
  assert(queue.readyJobs.has(1), "Job should be in readyJobs after promotion");
});

Deno.test("SwapTaskQueue - multiple independent buckets", async () => {
  const queue = new SwapTaskQueue();
  const task1Spy = spy((_signal: AbortSignal) => delay(20));
  const task2Spy = spy((_signal: AbortSignal) => delay(20));

  queue.push(1, task1Spy);
  queue.push(2, task2Spy);

  await delay(50);

  assertSpyCalls(task1Spy, 1);
  assertSpyCalls(task2Spy, 1);

  // Swap one bucket, ensure other is unaffected
  const task1SwapSpy = spy(
    (_signal: AbortSignal) => Promise.resolve(),
  );
  queue.push(1, task1SwapSpy);
  await delay(10);

  assertSpyCalls(task1SwapSpy, 1);
  assertEquals(
    // @ts-ignore: access private member for test
    queue.readyJobs.get(1)?.remainingSwaps,
    DEFAULT_INITIAL_SWAPS - 1,
  );
  // @ts-ignore: access private member for test
  assertEquals(queue.readyJobs.get(2)?.remainingSwaps, DEFAULT_INITIAL_SWAPS);
});

Deno.test("SwapTaskQueue - queue flushing order (simple)", async () => {
  const queue = new SwapTaskQueue();
  const callOrder: number[] = [];

  const task1 = spy(async (_signal: AbortSignal) => {
    await delay(30);
    callOrder.push(1);
  });
  const task2 = spy(async (_signal: AbortSignal) => {
    await delay(10);
    callOrder.push(2);
  });

  queue.push(1, task1);
  queue.push(2, task2); // Pushed second, but should run "first" due to shorter delay if queue was truly parallel
  // However, with single liveJob, it depends on push order and completion.

  await delay(100); // Wait for both to complete

  assertSpyCalls(task1, 1);
  assertSpyCalls(task2, 1);
  assertEquals(
    callOrder,
    [1, 2],
    "Tasks did not complete in expected order based on queue processing",
  );
});

Deno.test("SwapTaskQueue - task error handling", async () => {
  const queue = new SwapTaskQueue();
  const errorTaskSpy = spy(async (_signal: AbortSignal) => {
    await delay(10);
    throw new Error("Task failed intentionally");
  });
  const successTaskSpy = spy(
    (_signal: AbortSignal) => Promise.resolve(),
  );

  queue.push(1, errorTaskSpy);
  queue.push(2, successTaskSpy); // Should run even if task 1 fails

  await delay(50);

  assertSpyCalls(errorTaskSpy, 1);
  assertSpyCalls(successTaskSpy, 1);
  assertEquals(
    // @ts-ignore: access private member for test
    queue.liveJob,
    undefined,
    "Live job should be cleared after error",
  );
});

Deno.test("SwapTaskQueue - pushing same task ID rapidly (swap exhaustion)", async () => {
  const queue = new SwapTaskQueue();
  const taskSpies: ReturnType<typeof spy>[] = [];
  let lastTaskCompleter: () => void = () => {};

  // Push DEFAULT_INITIAL_SWAPS tasks that will be swapped
  for (let i = 0; i < DEFAULT_INITIAL_SWAPS; i++) {
    const task = spy(async (signal: AbortSignal) => {
      await delay(100); // Simulate work
      if (signal.aborted) return;
      // Only the last of these initial swaps should potentially complete if not swapped again
      if (i === DEFAULT_INITIAL_SWAPS - 1) {
        await new Promise<void>((resolve) => lastTaskCompleter = resolve);
      } else {
        throw new Error(
          `Task ${i} should have been aborted by a subsequent swap`,
        );
      }
    });
    taskSpies.push(task);
    queue.push(1, task);
    await delay(1); // Ensure they are pushed in sequence and trigger swaps
  }

  // This task should be blocked as swaps are exhausted
  const blockedTaskSpy = spy((_signal: AbortSignal) => Promise.resolve());
  queue.push(1, blockedTaskSpy);

  await delay(50); // Allow swaps and aborts to process

  for (let i = 0; i < DEFAULT_INITIAL_SWAPS - 1; i++) {
    assertSpyCalls(taskSpies[i], 1); // Called and aborted
  }
  assertSpyCalls(taskSpies[DEFAULT_INITIAL_SWAPS - 1], 1); // Called, currently "live"
  assertSpyCalls(blockedTaskSpy, 0); // Blocked

  lastTaskCompleter(); // Complete the "live" task
  await delay(10); // Allow blocked task to run

  assertSpyCalls(blockedTaskSpy, 1); // Now it should have run
});
