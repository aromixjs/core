import { BufferOptions, LogEvent, Sink } from "./types";

export class EventBuffer {
   private queue: LogEvent[] = []
   private flushIntervalMs: number
   private maxBatchSize: number
   private timer: NodeJS.Timeout | null = null

   constructor(
      private sinks: Sink[],
      options: Partial<BufferOptions> = {}
   ) {
      this.flushIntervalMs = options.flushIntervalMs ?? 1000
      this.maxBatchSize = options.maxBatchSize ?? 100
   }


   push(event: LogEvent) {
      this.queue.push(event)
      this.scheduleFlush()
      if (this.queue.length >= this.maxBatchSize) {
         this.flush()
      }
   }



   private scheduleFlush() {
      if (this.timer) {
         return
      }
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
      this.timer.unref()
   }



   async flush() {
      if (!this.queue.length) {
         return
      }
      const batch = this.queue.splice(0, this.queue.length)
      const results = await Promise.allSettled(this.sinks.map((sink) => sink.writeLogs(batch)))

      for (const result of results) {
         if (result.status === 'rejected') {
            console.error('[track]: sink failed', { cause: result.reason })
         }
      }
   }



   stop() {
      if (this.timer) {
         clearInterval(this.timer)
      }

      this.timer = null
   }



}