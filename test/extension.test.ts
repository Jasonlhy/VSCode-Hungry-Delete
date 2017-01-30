//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { Range, window, Position, TextEditor, TextDocument, Selection, commands, workspace } from 'vscode';
import * as myExtension from '../src/extension';

/**
 * 
 */
async function InsertSampleText() {
    let sampleText =
        `public
static

void


            main`;

    let editor = window.activeTextEditor;
    let result = await editor.edit(editorBuilder => {
        let position = new Position(0, 0);
        editorBuilder.insert(position, sampleText);
    });
    assert.ok(result);
}

async function DeleteSomeText() {
    let editor = window.activeTextEditor;
    let result = await editor.edit(editorBuilder => {
        editorBuilder.delete(new Range(0, 0, 0, 2));
    });
    // result = false;
    assert.ok(result);
}

function getTextByRange(range: Range): String {
    var document = window.activeTextEditor.document;
    if (document.validateRange(range)) {
        return document.getText(range);
    }
}

// this method have different name exists because no method overloading
// this exclude the character at ecol
function getText(sline: number, scol: number, eline: number, ecol: number) {
    let start = new Position(sline, scol);
    let end = new Position(eline, ecol);
    return getTextByRange(new Range(start, end));
}

async function ExecuteHungryDelete(title) {
    let r = await commands.executeCommand("extension.hungryDelete");
    if (!r && title){
        console.log("execute command failed for: " + title);
    }
}

// this is used to debug the content in the async test method
function debugContent(){
    console.log('1 line: ' + window.activeTextEditor.document.lineAt(0).text);
    console.log('2 line: ' + window.activeTextEditor.document.lineAt(1).text);
    console.log('3 line: ' + window.activeTextEditor.document.lineAt(2).text);
    console.log('4 line: ' + window.activeTextEditor.document.lineAt(3).text);
}

// Inesrt the sample text for each text case
setup(async () => {
    await InsertSampleText();
});



suite("Hungry Delete across line", () => {
    // the test only works for using space for tabs
    // because getText() doesn't quite work for \t ...
    test("Assert Sample Text", async () => {
        let firstLine = getText(0, 0, 0, 6);
        assert.equal(firstLine, "public");

        let secondLine = getText(1, 0, 1, 6);
        assert.equal(secondLine, "static");

        let fourLine = getText(3, 0, 3, 4);
        assert.equal(fourLine, "void");

        let sevenLine = getText(6, 12, 6, 16);
        assert.equal(sevenLine, "main");
    });


    test("No Skip line, No Leading Space", async () => {
        let editor = window.activeTextEditor;

        // No Skip line, No Leading Space
        let selection = new Selection(new Position(1, 0), new Position(1, 0));
        editor.selection = selection;

        await ExecuteHungryDelete("No Skip line, No Leading Space");

        let firstLine = getText(0, 0, 0, 12);
        assert.equal(firstLine, "publicstatic");
    });

    test("Skip line, No Leading Space", async () => {
        let editor = window.activeTextEditor;

        // Skip line, No Leading Space
        let selection = new Selection(new Position(3, 0), new Position(3, 0));
        editor.selection = selection;
        await ExecuteHungryDelete("Skip line, No Leading Space");

        let firstLine = getText(1, 0, 1, 10);
        assert.equal(firstLine, "staticvoid");
    });

    test("Skip line, With Leading Space", async () => {
        let editor = window.activeTextEditor;

        // Skip line, No Leading Space
        let selection = new Selection(new Position(6, 12), new Position(6, 12));
        editor.selection = selection;
        await ExecuteHungryDelete("Skip line, With Leading Space");

        let firstLine = getText(3, 0, 3, 8);
        assert.equal(firstLine, "voidmain");
    });

});