import * as vscode from 'vscode';

const lineCommentRegex = /\/\/.*$/;
const startBlockRegex = /^\s*(message|enum|oneof)\s+\w+\s+{$/;
const endBlockRegex = /^\s*}$/;

export class ProtoNumberCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext): Thenable<vscode.CompletionItem[]> {
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

            let closureNum = 0;
            let inOneofClosure: boolean = false;

            let allNumber: number[] = [];
            // Check number until smt start with message|enum ... {
            let upperLine = position.line;
            let oneofNums: number[] = [];
            while (upperLine > 0) {
                upperLine -= 1;
                const lineText = document.lineAt(upperLine).text.replace(lineCommentRegex, "").trim();
                if (lineText.match(endBlockRegex)) {
                    closureNum += 1;
                    continue;
                }
                const lineRes = lineText.match(startBlockRegex);
                if (lineRes) {
                    if (closureNum < 0) {
                        break;
                    }
                    if (closureNum === 0) {
                        if (lineRes[1] === "oneof" && !inOneofClosure) {
                            inOneofClosure = true;
                            continue;
                        }
                        break;
                    }
                    // If it is the first oneof then count
                    if (closureNum === 1) {
                        if (lineRes[1] === "oneof") {
                            oneofNums.forEach((num: number) => {
                                if (num > 0) {
                                    allNumber.push(num);
                                }
                            });
                        } else {
                            oneofNums = [];
                        }
                    }
                    closureNum -= 1;
                    continue;
                }
                // Collect in the case of oneof
                if (closureNum === 1) {
                    const nums = findProtoNums(lineText);
                    nums.forEach((num: number) => {
                        if (num > 0) {
                            oneofNums.push(num);
                        }
                    });
                }
                if (closureNum === 0) {
                    const nums = findProtoNums(lineText);
                    nums.forEach((num: number) => {
                        if (num > 0) {
                            allNumber.push(num);
                        }
                    });
                }
            }
            // Check until end of the block
            let lowerLine = position.line;
            closureNum = 0;
            let inoneof: boolean = false;
            let outOfOneofClosure: boolean = false;
            while (lowerLine < document.lineCount - 1) {
                lowerLine += 1;
                const lineText = document.lineAt(lowerLine).text.replace(lineCommentRegex, "").trim();
                const lineRes = lineText.match(startBlockRegex);
                if (lineRes) {
                    closureNum += 1;
                    if (closureNum === 1) {
                        inoneof = lineRes[1] === 'oneof';
                    }

                    continue;
                }
                if (lineText.match(endBlockRegex)) {
                    if (closureNum === 0) {
                        if (inOneofClosure && !outOfOneofClosure) {
                            outOfOneofClosure = true;
                            continue;
                        }
                        break;
                    }
                    closureNum -= 1;
                    continue;
                }
                if (closureNum === 0 || (inoneof && closureNum === 1)) {
                    const nums = findProtoNums(lineText);
                    nums.forEach((num: number) => {
                        if (num > 0) {
                            allNumber.push(num);
                        }
                    });
                }
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
const reserveToRegex = /\s*reserved\s+([0-9]+)\s+to\s+([0-9]+)/;
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
    const reserveToRes = line.match(reserveToRegex);
    if (reserveToRes) {
        const from = parseInt(reserveToRes[1]);
        const to = parseInt(reserveToRes[2]);
        if (from > 0 && to > 0 && to > from) {
            for (let i = from; i <= to; i++) {
                res.push(i);
            }
        }
    }
    const fieldRes = line.match(fieldRegex);
    if (fieldRes) {
        res.push(parseInt(fieldRes[1].trim()));
        return Array.from(new Set(res));
    }
    return res;
}