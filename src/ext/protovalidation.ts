import * as vscode from 'vscode';

const protobuf2RuleMap: { [key: string]: string } = {
    'google.protobuf.StringValue': 'string',
    'google.protobuf.FloatValue': 'float',
    'google.protobuf.DoubleValue': 'double',
    'google.protobuf.Int64Value': 'int64',
    'google.protobuf.UInt64Value': 'uint64',
    'google.protobuf.UInt32Value': 'uint32',
    'google.protobuf.BoolValue': 'bool',
    'google.protobuf.BytesValue': 'bytes',
    'google.protobuf.Int32Value': 'int32',
    'google.protobuf.Any': 'any',
    'google.protobuf.Duration': 'duration',
    'google.protobuf.Timestamp': 'timestamp',
};

const triggerWord = 'val';

const startProtobuf = /^\s*(google\.protobuf\.\w+)\s+.*$/;
const startScala = /^\s*(\w+)\s+.*$/;

const ruleMap: { [key: string]: string[] } = {
    message: ['skip', 'required'],
    float: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    double: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    int32: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    int64: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    uint32: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    uint64: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    sint32: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    sint64: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    fixed32: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    fixed64: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    sfixed32: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    sfixed64: ['const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    bool: ['const'],
    string: ['const', 'len', 'min_len', 'max_len', 'len_bytes', 'min_bytes', 'max_bytes', 'pattern', 'prefix', 'suffix', 'contains', 'not_contains', 'in', 'not_in', 'email', 'hostname', 'ip', 'ipv4', 'ipv6', 'uri', 'uri_ref', 'address', 'uuid'],
    bytes: ['const', 'len', 'min_len', 'max_len', 'pattern', 'prefix', 'suffix', 'contains', 'in', 'not_in', 'ip', 'ipv4', 'ipv6'],
    enum: ['const', 'defined_only', 'in', 'not_in'],
    repeated: ['min_items', 'max_items', 'unique', 'items'],
    map: ['min_pairs', 'max_pairs', 'no_sparse', 'keys', 'values'],
    any: ['required', 'in', 'not_in'],
    duration: ['required', 'const', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in'],
    timestamp: ['required', 'const', 'lt', 'lte', 'gt', 'gte', 'lt_now', 'gt_now', 'within'],
};

export class EnvoyValidateionCompletionItemProvider implements vscode.CompletionItemProvider {
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
            let lineText = document.lineAt(position.line).text.trim();

            const pbLineRes = lineText.match(startProtobuf);
            let scala: string|null = null;
            if (pbLineRes) {
                scala = protobuf2RuleMap[pbLineRes[1]];
            }
            if (!scala) {
                const scalaLineRes = lineText.match(startScala);
                if (scalaLineRes) {
                    scala = scalaLineRes[1];
                }
            }
            if (scala) {
                const attrs = ruleMap[scala];
                if (attrs.length > 0) {
                    for (let i = 0; i < attrs.length; i++) {
                        res.push(new vscode.CompletionItem(`validate.rules).${scala}.${attrs[i]} = `));
                    }
                    return resolve(res);
                }
            }

            // Default to message and enum
            for (let i = 0; i < ruleMap['message'].length; i++) {
                res.push(new vscode.CompletionItem(`validate.rules).message.${ruleMap['message'][i]} = `));
            }
            for (let i = 0; i < ruleMap['enum'].length; i++) {
                res.push(new vscode.CompletionItem(`validate.rules).enum.${ruleMap['message'][i]} = `));
            }
            return resolve(res);
        });
    }
}
