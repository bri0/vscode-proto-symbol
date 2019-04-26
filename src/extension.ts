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
    vscode.languages.registerCompletionItemProvider(
        { language: "proto3" }, new ProtoNumberCompletionItemProvider(), "="
    );
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

const lineCommentRegex = /\/\/.*$/;
const startBlockRegex = /^\s*(message|enum)\s+\w+\s+{$/;
const endBlockRegex = /^\s*}$/;

class ProtoNumberCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext): Thenable<vscode.CompletionItem[]>
    {
        return new Promise((resolve, reject) => {
            const res: vscode.CompletionItem[] = [];
            let lineText = document.lineAt(position.line).text;
            // trim comment
            lineText = lineText.replace(lineCommentRegex, "").trim();

            // Check if { pointer }
            const leftBracket = lineText.indexOf("{");
            const rightBracket = lineText.indexOf("}");
            if (leftBracket > 0 || rightBracket > 0) {
                return resolve(res);
            }

            let allNumber: number[] = [];
            // Check number until smt start with message|enum ... {
            let upperLine = position.line;
            while (upperLine > 0) {
                upperLine -= 1;
                const lineText = document.lineAt(upperLine).text.replace(lineCommentRegex, "").trim();
                if (lineText.match(startBlockRegex)) {
                    break;
                }
                const nums = findProtoNums(lineText);
                nums.forEach((num: number) => {
                    if (num > 0) {
                        allNumber.push(num);
                    }
                });
            }
            // Check until end of the block
            let lowerLine = position.line;
            while (lowerLine < document.lineCount - 1) {
                lowerLine += 1;
                const lineText = document.lineAt(lowerLine).text.replace(lineCommentRegex, "").trim();
                if (lineText.match(endBlockRegex)) {
                    break;
                }
                const nums = findProtoNums(lineText);
                nums.forEach((num: number) => {
                    if (num > 0) {
                        allNumber.push(num);
                    }
                });
            }

            // Make it unique
            allNumber = Array.from(new Set(allNumber));
            allNumber.sort((left, right) => left - right);
            let nextMax = 0;
            let nextAvail = 0;
            if (allNumber.length > 0) {
                nextMax = allNumber[allNumber.length - 1] + 1;
                while (allNumber.length > 0) {
                    const top = allNumber.shift();
                    if (top !== nextAvail + 1) {
                        break;
                    }
                    nextAvail += 1;
                }
            }
            nextAvail += 1;
            res.push(new vscode.CompletionItem(` ${nextMax};`));
            if (nextAvail !== nextMax) {
                res.push(new vscode.CompletionItem(` ${nextAvail};`));
            }
            resolve(res);
        });
    }
}

const reserveRegex = /\s*reserved\s+([0-9,\s]+)/;
const fieldRegex = /^.+\s*=\s*([1-9]+[0-9]*)\s*/;

function findProtoNums(line: string): number[] {
    const res: number[] = [];
    const reserveRes = line.match(reserveRegex);
    if (reserveRes) {
        reserveRes[1].split(",").forEach((str: string) => {
            const tr = str.trim();
            if (tr !== "") {
                res.push(parseInt(tr));
            }
        });
        return Array.from(new Set(res));
    }
    const fieldRes = line.match(fieldRegex);
    if (fieldRes) {
        res.push(parseInt(fieldRes[1].trim()));
        return Array.from(new Set(res));
    }
    return res;
}