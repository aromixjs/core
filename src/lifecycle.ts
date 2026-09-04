export abstract class ProgramLifeCycle {
   private running = false
   private stopping = false
   
   protected abstract onStart(): Promise<void>
   protected abstract onStop(): Promise<void>


   private readonly onSignal = async () => {
      await this.stop()
      process.exit(0)
   }

   private installSignalHandlers() {
      process.once('SIGINT', this.onSignal)
      process.once('SIGTERM', this.onSignal)
   }

   private removeSignalHandlers() {
      process.off('SIGINT', this.onSignal)
      process.off('SIGTERM', this.onSignal)
   }


   async start() {
      if (this.running) {
         return;
      }
      this.running = true

      try {
         await this.onStart()
         this.installSignalHandlers()
      } catch (error) {
         await this.stop()
         throw error
      }
   }


   async stop() {
      if (this.stopping || !this.running) {
         return;
      }
      this.stopping = true

      try {
         await this.onStop()
      } finally {
         this.running = false
         this.stopping = false
         this.removeSignalHandlers()
      }
   }



}