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
} from 'vscode';

import {
    ConfigurationProvider,
    HungryDeleteConfiguration
}  from './ConfigurationProvider'

const configProvider = new ConfigurationProvider();

/**
 * Override all the confiugrations of the config provider. Use it after the extension is actived
 *
 * This function is designed for testing purpose for I can "inject the dependency" of the config in testing scripts
 *
 * @param newConfig Read every key into internal config
 */
export function setConfig(newConfig: HungryDeleteConfiguration) {
    configProvider.setConfiguration(newConfig)
}

/**
 * Extension Method
 *
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
 * (Assume no triming space) Find the first non-empty character position in previous lines, used as start positon in deletion range
 *
 * @param {TextDocument} doc
 * @param {number} cursorLineNumber
 * @returns {Position} First non-empty character position in the above line
 */
function findStartPositionInPreviousLine(doc: TextDocument, cursorLineNumber: number): Position {
    const nonEmptyLine = findPreviousNonEmptyLine(cursorLineNumber, doc);
    if (nonEmptyLine){
        return nonEmptyLine.range.end;
    }

    return new Position(0, 0);
}

/**
 * Find the first non-empty line in the document, start from line with line number = cursorLineNumber - 1,
 *
 * @param {number} cursorLineNumber
 * @param {TextDocument} doc
 * @returns {TextLine} The line which is not emptyOrWhiteSpace, otherwise null
 */
function findPreviousNonEmptyLine(cursorLineNumber: number, doc: TextDocument): TextLine {
    for (let lineIdx = cursorLineNumber - 1; lineIdx >= 0; lineIdx--){
        let line = doc.lineAt(lineIdx);
        let empty = line.isEmptyOrWhitespace;
        if (!empty) {
            return line;
        }
    }

    return null;
}

/**
 * Contains the information of deletion range of smart backspace based on each cursor selection
 *
 * @interface SmartBackspaceDeletion
 */
interface SmartBackspaceDeletion {
    isKeepOneSpace?: boolean
    range: Range
}

/**
 * Find the first index of word or first l of continuous whitespaces or index of word Separator, used as start positon to be deleted
 *
 * This is used to perform a mock version of "deleteWorldLeft"
 *
 * @param {TextDocument} textDocument - Document working on
 * @param {TextLine} textLine - TextLine of cursor selection
 * @param {Position} position - Position of active cursor selection
 * 
 * @returns {Position} first index of word or first index of continuous whitespaces or index of word Separator
 */
function findStartPositionInCurrentLine(textDocument: TextDocument, textLine: TextLine, position: Position): Position {
    const text = textLine.text;
    let charIndexBefore = position.character - 1;
    let wordRange = textDocument.getWordRangeAtPosition(position);
    let wordRangeBefore = textDocument.getWordRangeAtPosition(new Position(position.line, charIndexBefore));

    // the cursor is at within word, end of word
    // and special case aaa |bbb but not include aaa |EOL
    if (wordRange && wordRangeBefore) {
        return wordRangeBefore.start;
    }

    // The cursor is at a whitespace
    let nonEmptyCharIndex = text.findLastIndex(theChar => /\S/.test(theChar), charIndexBefore);
    let offset = charIndexBefore - nonEmptyCharIndex;
    let deleteWhiteSpaceOnly = (offset > 1);

    if (deleteWhiteSpaceOnly) {
        return new Position(position.line, nonEmptyCharIndex + 1);
    }

    // Delete a space with the entire word at left
    // in consistent to the exisiting implementation of "deleteWorldLeft"
    wordRange = textDocument.getWordRangeAtPosition(new Position(position.line, nonEmptyCharIndex));
    if (wordRange) {
        return wordRange.start;
    }

    // For edge case : If there is Word Seperator, e.g. @ or =  - its word range is undefined
    // the exisiting implementation of "deleteWorldLeft" is to delete all of them "@@@@@|3333 444" => "333 4444"
    let separatorChar = text.charAt(nonEmptyCharIndex);
    const nonSeparatorIndex = text.findLastIndex(theChar => theChar !== separatorChar, nonEmptyCharIndex - 1);
    const endIdx = (nonSeparatorIndex < 0) ? 0 : (nonSeparatorIndex + 1);

    return new Position(position.line, endIdx);
}

/**
 * Search the range to be deleted for hungry delete, search the start position from a cursor positoin
 *
 * @param {TextDocument} textDocument - TextDocument working on
 * @param {Selection} selection - A cursor selection of document
 * @returns {Range} Range to be detected based on the input selection
 */
function findHungryDeletionRange(textDocument: TextDocument, selection: Selection): Range {
    if (!selection.isEmpty) {
        return new Range(selection.start, selection.end);
    }

    const activePosition = selection.active;
    const lineNumber = activePosition.line;
    const textLine = textDocument.lineAt(activePosition);

    const hungryDeleteAcrossLine = textLine.isEmptyOrWhitespace || (activePosition.character <= textLine.firstNonWhitespaceCharacterIndex);

    /* Determine the delete range */
    const startPosition = (hungryDeleteAcrossLine)
        ? findStartPositionInPreviousLine(textDocument, lineNumber)
        : findStartPositionInCurrentLine(textDocument, textLine, activePosition);
    const endPosition = activePosition;

    return new Range(startPosition, endPosition);
}

/**
 *  The hungry delete callback registered in the command
 *
 *  1. It searches the deletion range based on each selection position (a.k.a cursor position)
 *  2. Call EditorBuild to delete the deletion ranges from step 1
 *
 * @export
 * @returns {Thenable<Boolean>} Promise of the editor.delete() action, can be awaited, or chained, will be resolved async
 */
export function hungryDelete(): Thenable<Boolean> {
    const editor = window.activeTextEditor;
    const document = editor.document;
    const deleteRanges = editor.selections.map(selection => findHungryDeletionRange(document, selection));

    // It includs the startPosition but exclude the endPositon
    // This is an async operation and is in one transaction
    const returned = editor.edit(editorBuilder => {
        deleteRanges.forEach(range => editorBuilder.delete(range))
    });

    // Adjust the viewport
    if (deleteRanges.length <= 1) {
        editor.revealRange(new Range(editor.selection.start, editor.selection.end));
    }

    return returned;
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
 * @param {TextDocument} textDocument - TextDocument of Editor
 * @param {Selection} selection - A cursor selection of document
 * @returns {SmartBackspaceDeletion} SmartBackspaceDeletion, it includes the range to be detected based on the input selection, and whether to keep one space
 */
function findSmartBackspaceRange(textDocument: TextDocument, selection: Selection): SmartBackspaceDeletion {
    if (!selection.isEmpty) {
        return {
            range: new Range(selection.start, selection.end)
         };
    }

    const position = selection.active;
    const lineNumber = position.line;
    const textLine = textDocument.lineAt(position);

    let isSmartBackspace = (lineNumber > 0) && (position.character <= textLine.firstNonWhitespaceCharacterIndex);

    // Edge case, otherwise it will failed
    const isHeadOfDocument = position.line == 0 && position.character == 0;
    if (isHeadOfDocument) {
        return {
            range: new Range(position, position)
        };
    }

    if (isSmartBackspace) {
        let aboveLine = textDocument.lineAt(lineNumber - 1);
        let aboveRange = aboveLine.range;

        if (aboveLine.isEmptyOrWhitespace) {
            return {
                range: new Range(aboveRange.start, aboveRange.start.translate(1, 0))
            };
        }

        let startPosition = findStartPositionInPreviousLine(textDocument, lineNumber);
        let isKeepOneSpaceInSetting = configProvider.getConfiguration().KeepOneSpace;
        let startPositionChar = textDocument.getText(new Range(startPosition.translate(0, -1), startPosition));

        // For better UX ?
        // 1. Don't add space if current line is empty
        // 2. Only add space if start positon char is not space
        let isKeepOneSpace = isKeepOneSpaceInSetting &&
                            !textLine.isEmptyOrWhitespace &&
                            /\S/.test(startPositionChar);

        if (isKeepOneSpace) {
            return {
                isKeepOneSpace: true,
                range: new Range(startPosition, position)
            };
        } else {
            return {
                range: new Range(startPosition, position)
            };
        }
    }

    return {
        range: findInlineBackspaceRange(position, textDocument)
    };
}

/**
 * Find the deletion range using simple backspace in current line
 *
 * @param {Position} position - Position of the active cursor selection
 * @param {TextDocument} textDocument - TextDocument working on
 * @returns {Range} The range to be deleted using simple backspace
 */
function findInlineBackspaceRange(position: Position, textDocument: TextDocument) : Range {
    let positionBefore = position.translate(0, -1);
    let positionAfter = position.translate(0, 1);
    let peekBackward = textDocument.getText(new Range(positionBefore, position));
    let peekForward = textDocument.getText(new Range(position, positionAfter));
    let isAutoClosePair = ~configProvider.getConfiguration().CoupleCharacters.indexOf(peekBackward + peekForward);

    return (isAutoClosePair) ?
        new Range(positionBefore, positionAfter) :
        new Range(positionBefore, position);  // original backsapce
}

/**
 *  The smart backspace callback registered in the command
 *
 *  1. It searches the deletion range based on each selection position (a.k.a cursor position)
 *  2. Call EditorBuilder to delete the deletion ranges from step 1
 *
 * @export
 * @returns {Thenable<Boolean>} Promise of the editor.delete() action, can be awaited, or chained, will be resolved async
 */
export function smartBackspace(): Thenable<Boolean> {
    const editor = window.activeTextEditor;
    const document = editor.document;
    const deletions = editor.selections.map(selection => findSmartBackspaceRange(document, selection));

    const returned = editor.edit(editorBuilder => {
        deletions.forEach(deletion => {
            if (deletion.isKeepOneSpace) {
                let range = deletion.range;
                editorBuilder.insert(range.start, " ");
                editorBuilder.delete(range);
            } else {
                editorBuilder.delete(deletion.range)
            }
        })
    });

    if (deletions.length <= 1) {
        editor.revealRange(new Range(editor.selection.start, editor.selection.end));
    }

    return returned;
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