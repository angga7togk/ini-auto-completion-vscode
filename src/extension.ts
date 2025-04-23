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

  // Register completion provider
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
        const lineText = document.lineAt(position.line).text;
        const cursorOffset = position.character;
        if (
          !lineText.includes("Lang") &&
          !lineText.includes("lang") &&
          !isInString(lineText, cursorOffset)
        ) {
          return undefined;
        }

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
        }

        return completionItems;
      },
    },
    '"'
  );

  context.subscriptions.push(provider);

  // Register the new command
  const writeCommand = vscode.commands.registerCommand(
    "ini-auto-completion.writeToIni",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const document = editor.document;
      const position = editor.selection.active;
      const lineText = document.lineAt(position.line).text;

      // Match the string pattern
      const match = /"([^"]+)=([^"]+)"/.exec(lineText);
      if (!match) {
        vscode.window.showErrorMessage(
          "No valid key=value string found in the current line."
        );
        return;
      }

      const [_, key, value] = match;
      const [section, subKey] = key.split(".");

      if (!section || !subKey) {
        vscode.window.showErrorMessage(
          "Invalid format. Use section.key=value."
        );
        return;
      }

      if (!fs.existsSync(iniFilePath)) {
        vscode.window.showErrorMessage("INI file not found.");
        return;
      }

      // Read and parse the INI file
      const fileContent = fs.readFileSync(iniFilePath, "utf-8");
      const parsed = ini.parse(fileContent);

      // Add or update the key-value pair in the correct section
      if (!parsed[section]) {
        parsed[section] = {};
      }
      parsed[section][subKey] = value;

      // Write the updated content bac  k to the file
      const updatedContent = stringifyWithQuotes(parsed);
      fs.writeFileSync(iniFilePath, updatedContent, "utf-8");

      vscode.window.showInformationMessage(
        `Added/Updated "${key}" in section [${section}]!`
      );
    }
  );

  context.subscriptions.push(writeCommand);

  // Set a keybinding for the command (optional)
  vscode.commands.executeCommand("setContext", "writeToIni", true);
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Checks if the cursor is inside a string in the given line.
 * @param lineText The full text of the line.
 * @param cursorOffset The position of the cursor within the line.
 * @returns True if the cursor is inside a string, false otherwise.
 */
function isInString(lineText: string, cursorOffset: number): boolean {
  const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;

  let match;
  while ((match = stringRegex.exec(lineText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (cursorOffset > start && cursorOffset < end) {
      return true;
    }
  }

  return false;
}

function stringifyWithQuotes(parsed: any): string {
  let result = "";
  for (const section in parsed) {
    result += `[${section}]\n`;
    for (const key in parsed[section]) {
      let value = parsed[section][key];
      if (typeof value === "string") {
        value = value.replace(/\n/g, "\\n"); // Escape karakter \n
      }
      result += `${key}="${value}"\n`; // Tambahkan tanda kutip
    }
  }
  return result;
}

