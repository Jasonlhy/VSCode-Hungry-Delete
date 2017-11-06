'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
    window,
    commands,
    ExtensionContext,
    Position,
    Range,
    TextDocument,
    TextLine,
    Selection,
    workspace
} from 'vscode';

/**
 * Extension Method
 */
declare global {
    interface String {
        /**
         * Takes a predicate and returns the index of the first rightest char in the string satisfying the predicate,
         * or -1 if there is no such char.
         *
         * @param {number} columnNumber the column index starts testing
         * @param {(theChar: string) => Boolean} predicate to test the char
         * @returns {number} -1 if there is no such char
         *
         * @memberOf String
         */
        findLastIndex(predicate: (theChar: string) => Boolean, columnNumber?: number, ): number;
    }
}

String.prototype.findLastIndex = function (predicate: (theChar: string) => Boolean, columnNumber?: number) {
    if (typeof columnNumber === 'undefined') {
        columnNumber = this.length;
    }

    for (let i = columnNumber; i >= 0; i--) {
        if (predicate(this[i])) {
            return i;
        }
    }

    return -1;
}


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
        let nonEmptyCharIndex = text.findLastIndex(theChar => !/s/.test(theChar), charIndexBefore);
        let offset = charIndexBefore - nonEmptyCharIndex;
        let deleteWhiteSpaceOnly = (offset > 1);

        if (deleteWhiteSpaceOnly) {
            return new Position(cursorPosition.line, nonEmptyCharIndex + 1);
        } else {
            // delete a space with the entire word at left
            // in consistent to the exisiting implementation of "deleteWorldLeft"
            wordRange = doc.getWordRangeAtPosition(new Position(cursorPosition.line, nonEmptyCharIndex));
            if (wordRange) {
                return wordRange.start;
            } else {
                // For edge case : If there is Word Seperator, e.g. @ or =  - its word range is undefined
                // the exisiting implementation of "deleteWorldLeft" is to delete all of them "@@@@@|3333 444" => "333 4444"
                let idx = nonEmptyCharIndex;
                let separatorChar = text.charAt(idx);
                if (separatorChar === " ") {
                    idx = text.findLastIndex(theChar => !/s/.test(theChar), idx - 1);
                    if (idx < 0) {
                        return new Position(cursorPosition.line, 0);
                    } else {
                        separatorChar = text.charAt(idx);
                    }
                }

                const nonSeparatorIndex = text.findLastIndex(theChar => theChar !== separatorChar, idx - 1);
                const endIdx = (nonSeparatorIndex < 0) ? 0 : (nonSeparatorIndex + 1);

                return new Position(cursorPosition.line, endIdx);
            }
        }
    }
}

/**
 * Find the range to be deleted for hungry delete, backtracing the start position from a cursor positoin
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

    return new Range(startPosition, endPosition);
}


/**
 *  The hungry delete callback registered in the command
 *
 * @export
 * @returns {Thenable<Boolean>} Promise of the editor.delete() action, can be awaited, or chained, will be resolved async
 */
export function hungryDelete(): Thenable<Boolean> {
    /* Edior and doc */
    const editor = window.activeTextEditor;
    const doc = editor.document;
    const deleteRanges = editor.selections.map(selection => findDeleteRange(doc, selection));

    // it includs the startPosition but exclude the endPositon
    // This is in one transaction
    return editor.edit(editorBuilder => deleteRanges.forEach(range => editorBuilder.delete(range)));
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
function registerHungryDelete() {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.hungryDelete', hungryDelete);

    return disposable;
}

/**
 *  Find the range to be deleted for smart backspace, backtracing the start position from a cursor positoin
 *
 * @param {TextDocument} doc TextDocument of Editor
 * @param {Selection} selection selection Selection of cursor
 * @returns {Range}
 */
function findSmartBackspaceRange(doc: TextDocument, selection: Selection): Range {
    if (!selection.isEmpty) {
        return new Range(selection.start, selection.end);
    }

    const cursorPosition = selection.active;
    const cursorLineNumber = cursorPosition.line;
    const cursorLine = doc.lineAt(cursorPosition);

    let isSmartBackspace = (cursorLineNumber > 0) && (cursorPosition.character <= cursorLine.firstNonWhitespaceCharacterIndex);
    if (isSmartBackspace) {
        let aboveLine = doc.lineAt(cursorLineNumber - 1);
        let aboveRange = aboveLine.range;

        return (aboveLine.isEmptyOrWhitespace) ?
            new Range(aboveRange.start, aboveRange.start.translate(1, 0)) :
            new Range(backtraceAboveLine(doc, cursorLineNumber), cursorPosition);
    } else if (cursorPosition.line == 0 && cursorPosition.character == 0) {
        // edge case, otherwise it will failed
        return new Range(cursorPosition, cursorPosition);
    } else {
        let positionBefore = cursorPosition.translate(0, -1);
        let positionAfter = cursorPosition.translate(0, 1);
        let peekBackward = doc.getText(new Range(positionBefore, cursorPosition));
        let peekForward = doc.getText(new Range(cursorPosition, positionAfter));
        let isAutoClosePair = peekBackward === "(" && peekForward === ")";
        
        return (isAutoClosePair) ?
            new Range(positionBefore, positionAfter) :
            new Range(positionBefore, cursorPosition) // original backsapce
    }
}

function smartBackspace(): Thenable<Boolean> {
    const editor = window.activeTextEditor;
    const doc = editor.document;
    const deleteRanges = editor.selections.map(selection => findSmartBackspaceRange(doc, selection));

    return editor.edit(editorBuilder => deleteRanges.forEach(range => editorBuilder.delete(range)));
}

function registerSmartBackspace() {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.smartBackspace', smartBackspace);

    return disposable;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    context.subscriptions.push(registerHungryDelete());
    context.subscriptions.push(registerSmartBackspace());
}

// this method is called when your extension is deactivated
export function deactivate() {
}