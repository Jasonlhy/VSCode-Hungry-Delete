// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { Range, window, Position, Selection } from 'vscode';
import * as myExtension from '../../src/extension';
import { ConfigurationProvider } from '../../src/ConfigurationProvider';

/**
 * Insert sample text for testing
 */
export async function insertSampleText(sampleText: string): Promise<void> {
    let editor = window.activeTextEditor;
    let result = await editor.edit(editorBuilder => {
        let position = new Position(0, 0);
        editorBuilder.insert(position, sampleText);
    });
    assert.ok(result);
}

export function getTextByRange(range: Range): string {
    var document = window.activeTextEditor.document;
    if (document.validateRange(range)) {
        return document.getText(range);
    }
}

// this method have different name exists because no method overloading
// this exclude the character at ecol
export function getText(sline: number, scol: number, eline: number, ecol: number) {
    let start = new Position(sline, scol);
    let end = new Position(eline, ecol);
    return getTextByRange(new Range(start, end));
}

export async function executeHungryDelete(title) {
    let r = await myExtension.hungryDelete();
    if (!r && title) {
        console.log("execute command failed for: " + title);
    }
}

export async function executeSmartBackspace(title) {
    let r = await myExtension.smartBackspace();
    if (!r && title) {
        console.log("execute command failed for: " + title);
    }
}

// this is used to debug the content in the async test method
// because run vscode debugg not work
export function debugContent() {
    console.log('1 line: ' + window.activeTextEditor.document.lineAt(0).text);
    console.log('2 line: ' + window.activeTextEditor.document.lineAt(1).text);
    console.log('3 line: ' + window.activeTextEditor.document.lineAt(2).text);
    console.log('4 line: ' + window.activeTextEditor.document.lineAt(3).text);
}