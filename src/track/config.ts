import { EventBuffer } from './buffer'
import { ConsoleSink } from './sinks/console'
import { SqliteSink } from './sinks/sqlite'
import type { Sink, TrackConfig } from './types'

class TrackState {
   immediateSinks: Sink[] = [ConsoleSink]
   buffer = new EventBuffer([
      SqliteSink('.aromix/track.sql')
   ])

   config(options: Partial<TrackConfig>) {

      const custom = options.sinks ?? []
      const customImmediate = custom.filter((s) => s.mode === 'immediate')
      const customBuffered = custom.filter((s) => s.mode !== 'immediate')

      this.immediateSinks = [
         ...(options.console === false ? [] : [ConsoleSink]),
         ...customImmediate,
      ]


      const sqlitePath = options.sqlite === false ? null : options.sqlite ?? '.aromix/track.sql'
      const buffered = [
         ...(sqlitePath ? [SqliteSink(sqlitePath)] : []),
         ...customBuffered,
      ]

      this.buffer.stop()
      this.buffer = new EventBuffer(buffered, options.buffer)

   }
}



export const state = new TrackState()
