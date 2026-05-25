import { Node, Project, SyntaxKind } from 'ts-morph'

export interface MacroCall {
      /** Macro name */
      macro: string
      /** extracted arguments as js code */
      args: unknown[]
      /** Start index in source */
      start: number

      /** End index in source */
      end: number
      /** Line number for errors/debugging */
      line: number
}

/**
 * Finds all Aromix.xxx() calls in a source string.
 * And Returns There positions to properly replace them
 */
export class MacroFinder {
      private project = new Project({
            useInMemoryFileSystem: true,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: { allowJs: true },
      })

      find(source: string, filePath: string): MacroCall[] {
            const file = this.project.createSourceFile(filePath, source, { overwrite: true })

            const results: MacroCall[] = []

            for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
                  const expr = call.getExpression()
                  if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) {
                        continue
                  }

                  const obj = expr.getExpression()
                  if (!obj.isKind(SyntaxKind.Identifier)) {
                        continue
                  }
                  if (obj.getText() !== 'Aromix') {
                        continue
                  }

                  results.push({
                        macro: expr.getName(),
                        args: call.getArguments().map((arg) => this.extractValue(arg)),
                        start: call.getStart(),
                        end: call.getEnd(),
                        line: call.getStartLineNumber(),
                  })
            }

            return results
      }

      /**
       * Recursively extracts a node into its JS value.
       * Non-extractable nodes (runtime expressions, identifiers) return undefined.
       */
      private extractValue(node: Node): unknown {
            if (node.isKind(SyntaxKind.StringLiteral)) {
                  return node.getLiteralValue()
            }

            if (node.isKind(SyntaxKind.NumericLiteral)) {
                  return node.getLiteralValue()
            }

            if (node.isKind(SyntaxKind.TrueKeyword)) {
                  return true
            }
            if (node.isKind(SyntaxKind.FalseKeyword)) {
                  return false
            }
            if (node.isKind(SyntaxKind.NullKeyword)) {
                  return null
            }

            if (node.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
                  return node.getLiteralValue()
            }

            if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  return node.getElements().map((el) => this.extractValue(el))
            }

            if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const obj: Record<string, unknown> = {}
                  for (const prop of node.getProperties()) {
                        if (prop.isKind(SyntaxKind.PropertyAssignment)) {
                              const initializer = prop.getInitializer()
                              if (initializer) {
                                    obj[prop.getName()] = this.extractValue(initializer)
                              }
                        }
                  }
                  return obj
            }

            // runtime expression or unsupported — handler will see undefined
            return undefined
      }
}
