'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { ProtoDocumentSymbolProvider } from "./ext/protosymbol";
import { ProtoNumberCompletionItemProvider } from "./ext/protonumber";
import { ProtobufCompletionItemProvider } from "./ext/protobuf";
import { EnvoyValidateionCompletionItemProvider } from "./ext/protovalidation";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
        { scheme: 'file', language: "proto3" }, new ProtoDocumentSymbolProvider()
    ));
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: "proto3" }, new ProtoNumberCompletionItemProvider(), "="
    );
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: "proto3" }, new ProtobufCompletionItemProvider(), "g"
    );
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: "proto3" }, new EnvoyValidateionCompletionItemProvider(), "("
    );
}

// this method is called when your extension is deactivated
export function deactivate() {
}

