import { sep } from "node:path";
import { Project, SyntaxKind, type CallExpression, type SourceFile } from "ts-morph";
import { Glob } from "./glob";

export class Transformer {
	private project = new Project({ skipAddingFilesFromTsConfig: true });

	constructor(private resolver: Glob) {}

	/**
	 * Rewrites all load() call sites in a file, replacing each call with
	 * a JSON array literal of resolved absolute paths.
	 *
	 * load('@entity/*.entity.ts')  →  ["/abs/src/entities/User.entity.ts", ...]
	 */
	transform(filePath: string): string {
		const file = this.project.addSourceFileAtPath(filePath);

		this.findLoadCalls(file).forEach((call) => {
			const patterns = this.extractPatterns(call);
			const resolved = patterns
				.flatMap((p) => this.resolver.resolve(p, file.getDirectoryPath()))
				.map((p) => p.split(sep).join("/")); // normalize to forward slashes

			call.replaceWithText(JSON.stringify(resolved));
		});

		return file.getFullText();
	}

	private findLoadCalls(file: SourceFile): CallExpression[] {
		return file.getDescendantsOfKind(SyntaxKind.CallExpression).filter((call) => call.getExpression().getText() === "load");
	}

	private extractPatterns(call: CallExpression): string[] {
		const arg = call.getArguments()[0];

		if (arg.isKind(SyntaxKind.StringLiteral)) {
			return [arg.getLiteralValue()];
		}

		if (arg.isKind(SyntaxKind.ArrayLiteralExpression)) {
			return arg
				.getElements()
				.filter((el) => el.isKind(SyntaxKind.StringLiteral))
				.map((el) => el.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue());
		}

		throw new Error(
			`load() argument must be a string literal or array of string literals.\n` +
				`  Got: ${arg.getText()}\n` +
				`  At:  ${call.getSourceFile().getFilePath()}:${call.getStartLineNumber()}`
		);
	}
}
