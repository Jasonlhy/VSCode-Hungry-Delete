'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, ExtensionContext} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        const editor = window.activeTextEditor;
        const position = editor.selection.active;
        const currentLine = editor.document.lineAt(position);
        if (currentLine.isEmptyOrWhitespace){
            console.log("Is empty");
            commands.executeCommand("deleteLines", null, null);
            commands.executeCommand("cursorUp", null, null);
            commands.executeCommand("cursorEnd", null, null);
        } else {
            console.log("is not empty");
            commands.executeCommand("deleteWordLeft", null, null);
        }
        
        window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}