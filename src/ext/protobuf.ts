import * as vscode from 'vscode';

const triggerWord = 'goo';

const protobufs = [
	'StringValue',
	'FloatValue',
	'DoubleValue',
	'Int64Value',
	'UInt64Value',
	'UInt32Value',
	'BoolValue',
	'BytesValue',
	'Int32Value',
	'Any',
	'Duration',
	'Empty',
	'Struct',
	'Value',
	'ListValue',
	'Timestamp',
];

export class ProtobufCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
			const wordRange = document.getWordRangeAtPosition(position);
			const word = document.getText(wordRange);

			if (!word.startsWith(triggerWord)) {
				return resolve();
			}

			const res: vscode.CompletionItem[] = [];
			for (let i = 0; i < protobufs.length; i++) {
				const element = protobufs[i];
				res.push(new vscode.CompletionItem(`google.protobuf.${element} `));
			}
            resolve(res);
        });
    }
}
