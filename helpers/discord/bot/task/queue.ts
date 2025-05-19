import { BinaryHeap as Heap } from "jsr:@std/data-structures";

/**
 * @fileoverview A task queue that allows for swapping out tasks in a given "bucket"
 * (identified by a number) with a new task.
 *
 * Each bucket has a limited number of swaps available, and once exhausted,
 * no new tasks can be swapped in the bucket until the current task completes.
 *
 * This is useful for scenarios where you want to allow users to change their
 * minds about a task they've submitted, but want to prevent them from
 * spamming the system with rapid changes.
 *
 * The queue is implemented using a priority queue (min-heap) to ensure that
 * tasks with the fewest remaining swaps are executed first.
 */

type SwapBucketId = string;
type CancellableTask = (signal: AbortSignal) => Promise<void>;
type Comparison = -1 | 0 | 1;

interface SwapJob {
  id: SwapBucketId;
  task: CancellableTask;
  remainingSwaps: number;
  abortController: AbortController;
}

const DEFAULT_INITIAL_SWAPS = 6;
const minJobSwapComparator = (a: SwapJob, b: SwapJob): Comparison => {
  if (a.remainingSwaps > b.remainingSwaps) return -1;
  if (a.remainingSwaps < b.remainingSwaps) return 1;

  return 0;
};

export class SwapTaskQueue {
  private liveJob?: SwapJob;
  private isFlushing = false;
  private readyJobs = new Map<SwapBucketId, SwapJob>();
  private blockedJobs = new Map<SwapBucketId, SwapJob>();
  private queue = new Heap<SwapJob>(minJobSwapComparator);
  private initialSwaps = DEFAULT_INITIAL_SWAPS;

  push(id: SwapBucketId, task: CancellableTask) {
    const job: SwapJob = {
      id,
      task,
      remainingSwaps: this.initialSwaps - 1,
      abortController: new AbortController(),
    };

    console.log("[DEBUG] Pushing job:", job.id);

    if (this.isSwapLocked(job.id)) {
      console.log("[DEBUG] Blocking job:", job.id);
      return this.blockJob(job);
    }

    if (job.id === this.liveJob?.id) {
      this.liveJob.abortController.abort();

      console.log("[DEBUG] Aborted live job:", this.liveJob.id);

      job.remainingSwaps = this.liveJob.remainingSwaps - 1;

      this.readyJobs.set(job.id, job);

      return this.immediatelyRunJob(job);
    }

    if (this.readyJobs.has(id)) {
      job.remainingSwaps = this.readyJobs.get(id)!.remainingSwaps - 1;
    }

    this.readyJob(job);

    return this.flushQueue();
  }

  /**
   * Runs the given job immediately, if it is still the current ready job.
   * Handles job execution, error handling, and cleanup (blocked job promotion).
   */
  private async immediatelyRunJob(job: SwapJob) {
    const readyJob = this.readyJobs.get(job.id);

    // Skip if this job is outdated:
    if (!readyJob || readyJob !== job) {
      return;
    }

    this.liveJob = job;

    console.log("[DEBUG] Running job:", job.id);
    try {
      await job.task(job.abortController.signal);
      console.log("[DEBUG] Job completed:", job.id);
    } catch (error) {
      console.log("[DEBUG] Job failed/aborted:", job.id, error);
      // Job failed or was aborted: do nothing.
    } finally {
      // Cleanup step: promote blocked jobs and flush only if the job instance
      // whose task just completed was indeed the one considered 'live'.

      // This prevents outdated jobs from cluttering the execution.
      if (this.liveJob === job) {
        this.liveJob = undefined;

        if (this.blockedJobs.has(job.id)) {
          const blocked = this.blockedJobs.get(job.id)!;
          this.blockedJobs.delete(job.id);
          this.readyJob(blocked);
        }

        // Since the live job finished, always attempt to flush the queue
        // to process the next available task (could be the one just promoted, or another).
        this.flushQueue();
      }
    }
  }

  /**
   * Attempts to flush the queue, processing jobs until it's empty.
   */
  private async flushQueue() {
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    while (this.queue.length > 0) {
      const potentialJob = this.queue.pop();
      if (!potentialJob) {
        continue;
      }

      await this.immediatelyRunJob(potentialJob);
    }

    this.isFlushing = false;

    if (this.blockedJobs.size > 0) {
      for (const job of this.blockedJobs.values()) {
        this.readyJob(job);
        this.blockedJobs.delete(job.id);
      }

      this.flushQueue();
    }
  }

  private readyJob(job: SwapJob) {
    this.queue.push(job);
    this.readyJobs.set(job.id, job);
  }

  private blockJob(job: SwapJob) {
    this.blockedJobs.set(job.id, job);
  }

  private isSwapLocked(id: SwapBucketId) {
    if (this.liveJob?.id === id && this.liveJob.remainingSwaps <= 0) {
      return true;
    }

    if (this.readyJobs.has(id) && this.readyJobs.get(id)!.remainingSwaps <= 0) {
      return true;
    }

    return false;
  }
}
