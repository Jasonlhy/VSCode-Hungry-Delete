'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, commands, ExtensionContext, Position, Range, TextDocument, TextLine } from 'vscode';

/**
 * Back trace the first non-empty character position in the above line, used as start positon to be deleted
 */
function backtraceAboveLine(doc: TextDocument, cursorLineNumber: number): Position {
    // backtrace the first non-empty character position
    let backtraceLineNumber = cursorLineNumber - 1;
    let empty = true;
    while (backtraceLineNumber >= 0 && empty) {
        empty = doc.lineAt(backtraceLineNumber).isEmptyOrWhitespace;
        if (empty) {
            backtraceLineNumber--;
        }
    }

    let startPosition;
    if (backtraceLineNumber < 0) {
        startPosition = new Position(0, 0);
    } else {
        const nonEmptyLine = doc.lineAt(backtraceLineNumber);
        startPosition = nonEmptyLine.range.end; // it is the one after the last character (which may be space)!
    }

    return startPosition;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    // This extension simpliy override the keybinding ctrl+backspace to extends its hungry delete function above lines
    // currently ctrl+backspace will hungry delete the entire whitespace on line same line before the cursor
    // therefore, to implement "backtraceInLine" is not neccessary
    let disposable = commands.registerCommand('extension.hungryDelete', () => {
        /* Edior and doc */
        const editor = window.activeTextEditor;
        const doc = editor.document;

        /* Cursor data */
        const cursorPosition = editor.selection.active;
        const cursorLineNumber = cursorPosition.line;
        const cursorLine = doc.lineAt(cursorPosition);

        /* Find out the start position and end position to be deleted */
        if (cursorLine.isEmptyOrWhitespace || (cursorPosition.character <= cursorLine.firstNonWhitespaceCharacterIndex)) {
            const startPosition = backtraceAboveLine(doc, cursorLineNumber);
            const endPosition = cursorPosition;
            const deleteRange = new Range(startPosition, endPosition);

            let result = editor.edit((editorBuilder) => {
                // it includs the startPosition but exclude the endPositon
                editorBuilder.delete(deleteRange);
            })

            // only care Failed
            result.then(function (success) {
                if (!success) {
                    window.showErrorMessage("Failed to delete the text");
                }
            }, function () {
                window.showErrorMessage("Failed to invoke the editBuilder to delete the text");
            })
        } else {
            // delete whitespace on the same line only
            const result = commands.executeCommand("deleteWordLeft", null, null);
            result.then(null, function () {
                window.showErrorMessage("Failed to delte word lft")
            })
        }
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}