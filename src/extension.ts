'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, ExtensionContext, Position} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.hungryDelete', () => {
        
        // This extension simpliy override the keybinding ctrl+backspace
        const editor = window.activeTextEditor;
        let position = editor.selection.active;
        let currentLine = editor.document.lineAt(position);

        // continue to eat all the whitespace
        // until the line is not empty
        let anyHungryDelete = false;
        while (currentLine.isEmptyOrWhitespace && position.line > 0){
            anyHungryDelete = true;

            commands.executeCommand("deleteLines", null, null);
            commands.executeCommand("cursorUp", null, null);         

            // It seems that editor.selection.active does not work
            position = new Position(position.line - 1, 0);
            currentLine = editor.document.lineAt(position);
        } 

        if (anyHungryDelete){
            commands.executeCommand("cursorEnd", null, null);
        } else {
            commands.executeCommand("deleteWordLeft", null, null);
        }        
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}