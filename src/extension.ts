import * as vscode from "vscode";
import * as fs from "fs";
import * as ini from "ini";

export function activate(context: vscode.ExtensionContext) {
  const iniFilePath =
    vscode.workspace.workspaceFolders?.[0].uri.fsPath +
    "/src/main/resources/language/en_us.ini";

  console.log(
    'Congratulations, your extension "ini-auto-completion" is now active!'
  );

  const provider = vscode.languages.registerCompletionItemProvider(
    {
      scheme: "file",
      language: "java",
    },
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ) {
        const completionItems: vscode.CompletionItem[] = [];

        if (fs.existsSync(iniFilePath)) {
          console.log("INI file found! Reading...");
          const fileContent = fs.readFileSync(iniFilePath, "utf-8");
          const parsed = ini.parse(fileContent);

          for (const section in parsed) {
            const keys = Object.keys(parsed[section]);
            keys.forEach((key) => {
              const fullKey = `${section}.${key}`;

              const item = new vscode.CompletionItem(
                fullKey,
                vscode.CompletionItemKind.Text
              );
              item.detail = `Key: ${fullKey}`;
              item.documentation = `Use key "${fullKey}" in translation.`;
              completionItems.push(item);
            });
          }
          return completionItems;
        }
      },
    },
    '"',
    "."
  );

	context.subscriptions.push(provider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
