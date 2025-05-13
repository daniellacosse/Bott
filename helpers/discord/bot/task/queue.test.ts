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
    await delay(100, { signal }); // Simulate work
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
  assertEquals(job?.remainingSwaps, DEFAULT_INITIAL_SWAPS - 2);
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
    DEFAULT_INITIAL_SWAPS - 2,
  );
  // @ts-ignore: access private member for test
  assertEquals(
    queue.readyJobs.get(2)?.remainingSwaps,
    DEFAULT_INITIAL_SWAPS - 1,
  );
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
  queue.push(2, task2);

  await delay(100);

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
  queue.push(2, successTaskSpy);

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
  const taskSpies: any[] = [];
  let lastTaskCompleter: () => void = () => {};
  let liveTaskActuallyStarted = false;
  let liveTaskFinishedInternalWork = false;

  for (let i = 0; i < DEFAULT_INITIAL_SWAPS; i++) {
    if (i === DEFAULT_INITIAL_SWAPS - 1) {
      // This is the "live" task. Use a direct async function to avoid spy() bugs.
      const liveTaskInstance = async (signal: AbortSignal) => {
        liveTaskActuallyStarted = true;
        await delay(100);
        if (signal.aborted) {
          return;
        }
        await new Promise<void>((resolve) => {
          lastTaskCompleter = resolve;
        });
        liveTaskFinishedInternalWork = true;
      };
      taskSpies.push(spy(() => Promise.resolve())); // Placeholder spy for consistent array length
      queue.push(1, liveTaskInstance);
    } else {
      const taskToAbort = spy(async (signal: AbortSignal) => {
        await delay(100, { signal });
        if (signal.aborted) return;
        throw new Error(
          `Task ${i} should have been aborted by a subsequent swap`,
        );
      });
      taskSpies.push(taskToAbort);
      queue.push(1, taskToAbort);
    }
    await delay(1);
  }

  // This task should be blocked as swaps are exhausted
  const blockedTaskSpy = spy((_signal: AbortSignal) => Promise.resolve());
  queue.push(1, blockedTaskSpy);

  await delay(150);

  for (let i = 0; i < DEFAULT_INITIAL_SWAPS - 1; i++) {
    assertSpyCalls(taskSpies[i], 1);
  }

  assertSpyCalls(blockedTaskSpy, 0);
  assert(
    liveTaskActuallyStarted,
    "Live task did not seem to start its execution.",
  );

  lastTaskCompleter();
  await delay(10);

  assert(
    liveTaskFinishedInternalWork,
    "Live task did not finish its internal promise work after completer was called.",
  );
  assertSpyCalls(blockedTaskSpy, 1);
});
