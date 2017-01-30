'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, commands, ExtensionContext, Position, Range, TextDocument, TextLine, Selection, languages } from 'vscode';


/**
 * Back trace the first non-empty character position in the above line, used as start positon to be deleted
 *
 * @param {TextDocument} doc
 * @param {number} cursorLineNumber
 * @returns {Position} First non-empty character position in the above line
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


/**
 * Back trace the first index of word or first index of continuous whitespaces or index of word Separator, used as start positon to be deleted
 * 
 * This is used to perform a mock version of "deleteWorldLeft"
 * 
 * @param {TextDocument} doc
 * @param {TextLine} cursorLine
 * @param {Position} cursorPosition
 * @returns {Position} first index of word or first index of continuous whitespaces or index of word Separator
 */
function backtraceInLine(doc: TextDocument, cursorLine: TextLine, cursorPosition: Position): Position {
    const text = cursorLine.text;
    let charIndexBefore = cursorPosition.character - 1;
    let wordRange = doc.getWordRangeAtPosition(cursorPosition);
    let wordRangeBefore = doc.getWordRangeAtPosition(new Position(cursorPosition.line, charIndexBefore));

    // the cursor is at within word, end of word
    // and special case aaa |bbb but not include aaa |EOL
    if (wordRange && wordRangeBefore) {
        return wordRangeBefore.start;
    } else {
        // the cursor is at a whitespace
        let nonEmptyCharIndex = findFirstNonEmpty(text, charIndexBefore);
        let offset = charIndexBefore - nonEmptyCharIndex;
        let deleteWhiteSpaceOnly = (offset > 1);

        if (deleteWhiteSpaceOnly) {
            return new Position(cursorPosition.line, nonEmptyCharIndex + 1);
        } else {
            // delete a space with the entire word at left
            // in consistent to the exisiting implementation of "deleteWorldLeft"
            wordRange = doc.getWordRangeAtPosition(new Position(cursorPosition.line, nonEmptyCharIndex));
            if (wordRange){
                return wordRange.start;
            } else {
                // For edge case : If there is Word Seperator, e.g. @ or =  - its word range is undefined
                // the exisiting implementation of "deleteWorldLeft" is to delete all of them "@@@@@|3333 444" => "333 4444"
                const separatorChar = text.charAt(nonEmptyCharIndex);
                const nonSeparatorIndex = findFirstNonSeparator(text, nonEmptyCharIndex - 1, separatorChar);
            
                if (nonSeparatorIndex < 0){
                    return new Position(cursorPosition.line, 0);
                } else {
                    return new Position(cursorPosition.line, nonSeparatorIndex + 1);
                }
            }
        }
    }
    }

/**
 * Find the non-empty character from backtracing at columnNumber
 * 
 * @param {String} text
 * @param {number} columnNumber
 * @returns {number}
 */
function findFirstNonEmpty(text: String, columnNumber: number): number {
    for (let i = columnNumber; i >= 0; i--) {
        let c = text.charAt(i);
        let isWhiteSpace = /\s/.test(c);

        if (!isWhiteSpace) {
            return i;
        }
    }

    return -1;
}


/**
 * Find the character that don't match with wordSeparator from backtracing at columnNumber
 * 
 * @param {String} text
 * @param {number} columnNumber
 * @param {String} wordSeparator
 * @returns {number}
 */
function findFirstNonSeparator(text: String, columnNumber: number, wordSeparator : String): number {
    for (let i = columnNumber; i >= 0; i--) {
        let c = text.charAt(i);

        if (c !== wordSeparator) {
            return i;
        }
    }

    return -1;
}

/**
 * Find the range to be deleted with backtracing the start position from a cursor positoin
 *
 * @param {TextDocument} doc TextDocument of Editor
 * @param {Selection} selection Selection of cursor
 * @returns {Range} if the selection is valid for hungry delete above line
 */
function findDeleteRange(doc: TextDocument, selection: Selection): Range {
    if (!selection.isEmpty) {
        return new Range(selection.start, selection.end);
    }

    const cursorPosition = selection.active;
    const cursorLineNumber = cursorPosition.line;
    const cursorLine = doc.lineAt(cursorPosition);

    const hungryDeleteAcrossLine = cursorLine.isEmptyOrWhitespace || (cursorPosition.character <= cursorLine.firstNonWhitespaceCharacterIndex);

    /* Determine the delete range */
    const startPosition = (hungryDeleteAcrossLine)
        ? backtraceAboveLine(doc, cursorLineNumber)
        : backtraceInLine(doc, cursorLine, cursorPosition);
    const endPosition = cursorPosition;
    const deleteRange = new Range(startPosition, endPosition);

    return deleteRange;
}


/**
 * Register the hundry delete commmand
 *
 * This extension simpliy override the keybinding ctrl+backspace to extends its hungry delete function to above lines
 * Currently ctrl+backspace will hungry delete the entire whitespace on the same line before the cursor
 * Therefore, to implement "backtraceInLine" is not neccessary
 *
 * @returns disposable to be registered in the context
 */
function hungryDelete() {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.hungryDelete', async () => {

        /* Edior and doc */
        const editor = window.activeTextEditor;
        const doc = editor.document;

        const deleteRanges = editor.selections.map((selection) => {
            return findDeleteRange(doc, selection);
        });

        // it includs the startPosition but exclude the endPositon
        // This is in one transaction
        let result = editor.edit((editorBuilder) => {
            deleteRanges.forEach((deleteRange) => {
                 editorBuilder.delete(deleteRange);
            });
        });

        let success = await result;
        console.log("Success: " + success);
        return success;
    });

    return disposable;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    let disposable = hungryDelete();
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}