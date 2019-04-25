'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
        { language: "proto3" }, new ProtoDocumentSymbolProvider()
    ));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

const SignatureRegex = /^(\s*)(message|enum|service|rpc)\s+(\w+)\s+{.*/;

class ProtoDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument,
        token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            let symbols: vscode.SymbolInformation[] = [];

            let containers: {lvl: number, id: string}[] = [];
            let lastLvl = -1;

            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i);
                let matches = line.text.match(SignatureRegex);
                if (!matches || matches.length < 4) {
                    continue;
                }
                let symbolKind: vscode.SymbolKind;
                switch (matches[2]) {
                    case "enum":
                        symbolKind = vscode.SymbolKind.Enum;
                        break;
                    case "service":
                        symbolKind = vscode.SymbolKind.Interface;
                        break;
                    case "rpc":
                        symbolKind = vscode.SymbolKind.Method;
                        break;
                    default:
                        symbolKind = vscode.SymbolKind.Struct;
                        break;
                }

                if (matches[1].length > lastLvl) {
                    lastLvl = matches[1].length;
                    containers.push({
                        id: matches[3],
                        lvl: lastLvl,
                    });
                }

                if (matches[1].length === lastLvl) {
                    containers.pop();
                    containers.push({
                        id: matches[3],
                        lvl: lastLvl,
                    });
                }

                if (matches[1].length < lastLvl) {
                    lastLvl = matches[1].length;
                    while (containers.length > 0 && containers[containers.length-1].lvl >= lastLvl) {
                        containers.pop();
                    }
                    containers.push({
                        id: matches[3],
                        lvl: lastLvl,
                    });
                }

                let containerName = containers.map((con: {lvl: number; id: string}) => con.id).join(" > ");

                symbols.push(new vscode.SymbolInformation(
                    matches[3],
                    symbolKind,
                    containerName,
                    new vscode.Location(document.uri, line.range),
                ));
            }

            resolve(symbols);
        });
    }
}