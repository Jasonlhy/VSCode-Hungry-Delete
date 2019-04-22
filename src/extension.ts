'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
    window,
    commands,
    ExtensionContext,
    Position,
    Range,
    TextEditor,
    TextDocument,
    TextLine,
    Selection,
} from 'vscode';

import {
    ConfigurationProvider,
    HungryDeleteConfiguration
} from './ConfigurationProvider'

/**
 * Singleton config provider
 */
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
 * Little util function to test non empty (whitespace) char using regex
 *
 * @param theChar
 */
const isNonEmptyChar = function (theChar: string): Boolean {
    return /\S/.test(theChar);
}

/**
 * Find the last non-empty character position in previous lines, used as start positon in deletion range
 * (Assume no triming space)
 *
 * @param {TextDocument} textDocument
 * @param {number} lineNumber
 * @returns {Position} First non-empty character position in the above line
 */
function findLastStartPosition(textDocument: TextDocument, lineNumber: number): Position {
    const nonEmptyLine = findLastNonEmptyLine(textDocument, lineNumber);
    if (nonEmptyLine) {
        return nonEmptyLine.range.end;
    }

    return new Position(0, 0);
}

/**
 * Find the last non-empty line in the document, start from line with line number = cursorLineNumber - 1,
 *
 * @param {number} lineNumber
 * @param {TextDocument} textDocument
 * @returns {TextLine} The line which is not emptyOrWhiteSpace, otherwise null
 */
function findLastNonEmptyLine(textDocument: TextDocument, lineNumber: number): TextLine {
    for (let lineIdx = lineNumber - 1; lineIdx >= 0; lineIdx--) {
        let line = textDocument.lineAt(lineIdx);
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
 * Find the start position of the deletion range.
 * It could be first index of word, first index of continuous whitespaces, or index of word Separator
 *
 * This is used to perform a mock version of "deleteWorldLeft"
 *
 * @param {TextDocument} textDocument - Document working on
 * @param {TextLine} textLine - TextLine of cursor selection
 * @param {Position} position - Position of active cursor selection
 *
 * @returns {Position} first index of word or first index of continuous whitespaces or index of word Separator
 */
function findDeleteWorldLeftStartPosition(
    textDocument: TextDocument,
    textLine: TextLine,
    position: Position): Position {
    const text = textLine.text;
    const charIndexBefore = position.character - 1;

    // The cursor is at a whitespace (both side are white space)
    let lastNonEmptyChar = text.findLastIndex(isNonEmptyChar, charIndexBefore);
    let offset = charIndexBefore - lastNonEmptyChar;
    let deleteWhiteSpaceOnly = (offset > 1);

    if (deleteWhiteSpaceOnly) {
        return new Position(position.line, lastNonEmptyChar + 1);
    }

    // Delete a space with the entire word at left
    // in consistent to the exisiting implementation of "deleteWorldLeft"
    // The word is different in each language
    // let wordRange = textDocument.getWordRangeAtPosition(new Position(position.line, lastNonEmptyChar), /[a-zA-Z]+/);
    let wordRange = textDocument.getWordRangeAtPosition(new Position(position.line, lastNonEmptyChar));
    if (wordRange) {
        return wordRange.start;
    }

    return findSeperatorStartPosition(text, lastNonEmptyChar, position);
}

/**
 * Edge case: If there is Word Seperator, e.g. @ or =  - its word range is undefined
 * the exisiting implementation of "deleteWorldLeft" is to delete all of them "@@@@@|3333 444" => "333 4444"
 *
 * @param text
 * @param lastNonEmptyChar
 * @param position
 */
function findSeperatorStartPosition(text: string, lastNonEmptyChar: number, position: Position) {
    let separatorChar = text.charAt(lastNonEmptyChar);
    const nonSeparatorIndex = text.findLastIndex(theChar => theChar !== separatorChar, lastNonEmptyChar - 1);
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
function findHungryDeleteRange(textDocument: TextDocument, selection: Selection): Range {
    if (!selection.isEmpty) {
        return new Range(selection.start, selection.end);
    }

    const activePosition = selection.active;
    const lineNumber = activePosition.line;
    const textLine = textDocument.lineAt(activePosition);

    const hungryDeleteAcrossLine = textLine.isEmptyOrWhitespace
        || (activePosition.character <= textLine.firstNonWhitespaceCharacterIndex);

    /* Determine the delete range */
    const startPosition = (hungryDeleteAcrossLine)
        ? findLastStartPosition(textDocument, lineNumber)
        : findDeleteWorldLeftStartPosition(textDocument, textLine, activePosition);
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
    const deleteRanges = editor.selections.map(selection => findHungryDeleteRange(document, selection));

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
function findSmartBackspaceRange(
    textEditor: TextEditor,
    textDocument: TextDocument,
    selection: Selection): SmartBackspaceDeletion {
    if (!selection.isEmpty) {
        return {
            range: new Range(selection.start, selection.end)
        };
    }

    const activePosition = selection.active;
    const lineNumber = activePosition.line;
    const textLine = textDocument.lineAt(activePosition);
    let isSmartBackspace = (lineNumber > 0)
        && (activePosition.character <= textLine.firstNonWhitespaceCharacterIndex);

    if (isSmartBackspace) {
        const endPosition = activePosition;

        let aboveLine = textDocument.lineAt(lineNumber - 1);
        let aboveRange = aboveLine.range;

        // Just move one online up
        if (aboveLine.isEmptyOrWhitespace) {
            return {
                range: new Range(aboveRange.start, aboveRange.start.translate(1, 0))
            };
        }

        // Consider indent rule
        const config = configProvider.getConfiguration();
        if (!textLine.isEmptyOrWhitespace){
            // When getting a text editor's options, this property will always be a number (resolved).
            // When setting a text editor's options, this property is optional and it can be a number or "auto".
            const tabSize = textEditor.options.tabSize as number;
            const aboveNonEmptyIdx = aboveLine.firstNonWhitespaceCharacterIndex;
            const lineNonEmptyIdx = textLine.firstNonWhitespaceCharacterIndex;

            if (config.ConsiderIncreaseIndentPattern && configProvider.increaseIndentAfterLine(aboveLine, textDocument.languageId)){
                const expectedLineNonEmptyIdx = (aboveNonEmptyIdx + tabSize);
                const indentDifference = lineNonEmptyIdx - expectedLineNonEmptyIdx;

                if (indentDifference > 0){
                    const theEnd = new Position(lineNumber, textLine.firstNonWhitespaceCharacterIndex);
                    const theStart = theEnd.translate(0, -(indentDifference));

                    return {
                        range: new Range(theStart, theEnd)
                    };
                }
            }

            if (config.FollowAbovelineIndent && !configProvider.increaseIndentAfterLine(aboveLine, textDocument.languageId)){
                const expectedLineNonEmptyIdx = aboveNonEmptyIdx;
                const indentDifference = lineNonEmptyIdx - expectedLineNonEmptyIdx;

                if (indentDifference > 0){
                    const theEnd = new Position(lineNumber, textLine.firstNonWhitespaceCharacterIndex);
                    const theStart = theEnd.translate(0, -(indentDifference));

                    return {
                        range: new Range(theStart, theEnd)
                    };
                }
            }
        }

        // Keep One Space
        let startPosition = findLastStartPosition(textDocument, lineNumber);
        let isKeepOneSpaceInSetting = configProvider.getConfiguration().KeepOneSpace;
        let startPositionChar = textDocument.getText(new Range(startPosition.translate(0, -1), startPosition));

        // For better UX ?
        // 1. Don't add space if current line is empty
        // 2. Only add space if start positon char is not space
        let isKeepOneSpace = isKeepOneSpaceInSetting &&
            !textLine.isEmptyOrWhitespace &&
            isNonEmptyChar(startPositionChar) &&
            !configProvider.isKeepOnespaceException(startPositionChar);

        if (isKeepOneSpace) {
            return {
                isKeepOneSpace: true,
                range: new Range(startPosition, endPosition)
            };
        }

        // Ordinary SmartBackspace
        return {
            range: new Range(startPosition, endPosition)
        };
    }

    return {
        range: findInlineBackspaceRange(activePosition, textDocument)
    };
}

/**
 * Find the deletion range using simple backspace in current line
 *
 * @param {Position} position - Position of the active cursor selection
 * @param {TextDocument} textDocument - TextDocument working on
 * @returns {Range} The range to be deleted using simple backspace
 */
function findInlineBackspaceRange(position: Position, textDocument: TextDocument): Range {
    // Edge case, otherwise it will failed
    const isHeadOfDocument = position.line == 0 && position.character == 0;
    if (isHeadOfDocument) {
        return new Range(position, position)
    }

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
    const deletions = editor.selections.map(selection => findSmartBackspaceRange(editor, document, selection));

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

    configProvider.listenConfigurationChange();
}

// this method is called when your extension is deactivated
export function deactivate() {
    configProvider.unlistenConfigurationChange();
}
