import { BinaryHeap as Heap } from "jsr:@std/data-structures"; 

type SwapBucketId = number;
type CancellableTask = (controller: AbortController) => Promise<void>;
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
      remainingSwaps: this.initialSwaps,
      abortController: new AbortController()
    };
  
    if (this.isSwapLocked(job.id)) {
      return this.blockJob(job);
    }

    if (job.id === this.liveJob?.id) {
      this.liveJob.abortController.abort();

      job.remainingSwaps = this.liveJob.remainingSwaps - 1;

      this.readyJob(job);

      return this.try(job);
    }

    if (this.readyJobs.has(id)) {
      job.remainingSwaps = this.readyJobs.get(id)!.remainingSwaps - 1;
    }

    this.readyJob(job);

    return this.flushQueue();
  }

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

      await this.try(potentialJob);
    }

    this.isFlushing = false;
  }

  private async try(job: SwapJob) {
    const readyJob = this.readyJobs.get(job.id);

    // Skip if this job is outdated:
    if (!readyJob || readyJob !== job) {
      return;
    }

    this.liveJob = job
       
    try {
      await job.task(job.abortController);
    } catch (_) {
      // do nothing
    } finally {
      this.liveJob = undefined;

      // Promote previous blocked job to "ready":
      if (this.blockedJobs.has(job.id)) {
        this.readyJob(this.blockedJobs.get(job.id)!);
        this.blockedJobs.delete(job.id);
      }
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
    if (this.liveJob?.id === id && this.liveJob.remainingSwaps > 0) {
      return true;
    }
    
    if (this.readyJobs.has(id) && this.readyJobs.get(id)!.remainingSwaps > 0) {
      return true;
    }

    return false;
  }
}
