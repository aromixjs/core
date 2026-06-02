import { Schema, State } from "./types";



export interface Issue {
   message: string
   received: unknown
}



export class Validator {

   constructor(private state: State) { }

   run(value: unknown): Issue[] {
      if (value === undefined && this.state.optional) return []
      if (value === null && this.state.nullable) return []

      if (!this.check(value)) {
         const message = `Expected ${this.state.type}, got ${value === null ? 'null' : typeof value}`
         return [{ message, received: value }]
      }

      const allIssues: Issue[] = []

      if (this.state.type === 'object' && this.state.object) {
         const obj: any = value

         for (const key of Object.keys(this.state.object.shape)) {
            const schema = this.state.object.shape[key]
            const issues = new Validator(schema.state).run(obj[key])
            for (const issue of issues) {
               allIssues.push({ message: `${key}: ${issue.message}`, received: issue.received })
            }
         }
      }

      if (this.state.type === 'array' && this.state.array) {
         const arr = value as unknown[]
         for (let i = 0; i < arr.length; i++) {
            const issues = new Validator(this.state.array.element.state).run(arr[i])
            for (const issue of issues) {
               allIssues.push({ message: `[${i}]: ${issue.message}`, received: issue.received })
            }
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
      }
   }

}


export class ValidationError extends Error {
   constructor(public issues: Issue[]) {
      super(issues.map(i => i.message).join(', '))
      this.name = 'ValidationError'
   }
}