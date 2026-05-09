const vscode = require("vscode");

/**
 * @typedef {{
 *   configurePlugin(pluginId: string, configuration: {}): void,
 *   onCompletionAccepted: vscode.Event<vscode.CompletionItem & { metadata?: any }>
 * }} TypeScriptApiV0
 *
 * @typedef {{
 *   getAPI(version: 0): TypeScriptApiV0 | undefined
 *   getAPI(version: number): undefined
 * }} TypeScriptExtensionExports
 */

/**
 * @param {import('vscode').ExtensionContext} context
 */
async function activate(context) {
  const tsExtension = vscode.extensions.getExtension(
    "vscode.typescript-language-features",
  );

  if (!tsExtension) {
    vscode.window.showErrorMessage("Aromix: TypeScript extension not found");
    return;
  }

  await tsExtension.activate();

  /** @type {TypeScriptExtensionExports} */
  const api = tsExtension.exports;
  const v0 = api.getAPI(0);

  if (!v0) {
    vscode.window.showErrorMessage("Aromix: Could not get TypeScript API");
    return;
  }

  v0.configurePlugin("@aromix/ts-plugin", {});

  vscode.window.showInformationMessage("Aromix: TypeScript API ready");
}

function deactivate() {}

const { init } = require("@aromix/ts-plugin");

module.exports = { activate, deactivate, init };
