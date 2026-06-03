import { Schema, State } from "./types";



export interface Issue {
   message: string
   received: unknown
}



export class Validate {

   constructor(private state: State) { }

   run(value: unknown): Issue[] {
      if (!this.check(value)) {
         const message = `Expected ${this.state.type}, got ${value === null ? 'null' : typeof value}`
         return [{ message, received: value }]
      }

      const allIssues: Issue[] = []

      if (this.state.type === 'object' && this.state.object) {
         const obj: any = value

         for (const key of Object.keys(this.state.object.shape)) {
            const schema = this.state.object.shape[key]
            try { schema.parse(obj[key]) } catch (e) {
               if (e instanceof ValidationError) {
                  for (const issue of e.issues) {
                     allIssues.push({ message: `${key}: ${issue.message}`, received: issue.received })
                  }
               }
            }
         }
      }

      if (this.state.type === 'array' && this.state.array) {
         const arr = value as unknown[]
         for (let i = 0; i < arr.length; i++) {
            try { this.state.array.element.parse(arr[i]) } catch (e) {
               if (e instanceof ValidationError) {
                  for (const issue of e.issues) {
                     allIssues.push({ message: `[${i}]: ${issue.message}`, received: issue.received })
                  }
               }
            }
         }
      }

      if (this.state.type === 'tuple' && this.state.tuple) {
         const arr = value as unknown[]
         for (let i = 0; i < this.state.tuple.elements.length; i++) {
            try { this.state.tuple.elements[i].parse(arr[i]) } catch (e) {
               if (e instanceof ValidationError) {
                  for (const issue of e.issues) {
                     allIssues.push({ message: `[${i}]: ${issue.message}`, received: issue.received })
                  }
               }
            }
         }
      }

      if (this.state.type === 'literal' && this.state.literal) {
         if (value !== this.state.literal.value) {
            allIssues.push({ message: `Expected literal ${String(this.state.literal.value)}, got ${value === null ? 'null' : typeof value}`, received: value })
         }
      }

      if (this.state.type === 'record' && this.state.record) {
         const obj = value as Record<string, unknown>
         for (const key of Object.keys(obj)) {
            try { this.state.record.value.parse(obj[key]) } catch (e) {
               if (e instanceof ValidationError) {
                  for (const issue of e.issues) {
                     allIssues.push({ message: `${key}: ${issue.message}`, received: issue.received })
                  }
               }
            }
         }
      }

      if (this.state.type === 'union' && this.state.union) {
         let matched = false
         for (const schema of this.state.union.schemas) {
            try { schema.parse(value); matched = true; break } catch {}
         }
         if (!matched) {
            allIssues.push({ message: `Invalid union, no branch matched`, received: value })
         }
      }

      return allIssues
   }

   private check(value: unknown): boolean {
      switch (this.state.type) {
         case 'string': return typeof value === 'string'
         case 'number': return typeof value === 'number' && !Number.isNaN(value)
         case 'boolean': return typeof value === 'boolean'
         case 'bigint': return typeof value === 'bigint'
         case 'symbol': return typeof value === 'symbol'
         case 'null': return value === null
         case 'undefined': return value === undefined
         case 'unknown': return true
         case 'never': return false
          case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
          case 'array': return Array.isArray(value)
          case 'tuple': return Array.isArray(value)
          case 'literal': return true // checked in run() with strict equality
          case 'record': return typeof value === 'object' && value !== null && !Array.isArray(value)
          case 'union': return true // checked in run()
          case 'date': return value instanceof Date && !isNaN(value.getTime())
      }
   }

}


export class ValidationError extends Error {
   constructor(public issues: Issue[]) {
      super(issues.map(i => i.message).join(', '))
      this.name = 'ValidationError'
   }
}