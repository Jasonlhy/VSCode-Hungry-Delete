//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
// Please remove the welcome page in orde to run the test case

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { Range, window, Position, Selection } from 'vscode';
import * as myExtension from '../src/extension';
import { ConfigurationProvider } from '../src/ConfigurationProvider'

// This whole testing script is integration testing
// 1. It fires up the vscode and the extension
// 2. Insert code sample, and execute the extension function
// 3. Assert the result

/**
 * Insert sample text for testing
 */
async function InsertSampleText(sampleText: string): Promise<void> {
    let editor = window.activeTextEditor;
    let result = await editor.edit(editorBuilder => {
        let position = new Position(0, 0);
        editorBuilder.insert(position, sampleText);
    });
    assert.ok(result);
}

function getTextByRange(range: Range): string {
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
    let r = await myExtension.hungryDelete();
    if (!r && title) {
        console.log("execute command failed for: " + title);
    }
}

async function ExecuteSmartBackspace(title) {
    let r = await myExtension.smartBackspace();
    if (!r && title) {
        console.log("execute command failed for: " + title);
    }
}

// this is used to debug the content in the async test method
function debugContent() {
    console.log('1 line: ' + window.activeTextEditor.document.lineAt(0).text);
    console.log('2 line: ' + window.activeTextEditor.document.lineAt(1).text);
    console.log('3 line: ' + window.activeTextEditor.document.lineAt(2).text);
    console.log('4 line: ' + window.activeTextEditor.document.lineAt(3).text);
}

suite("Hungry Delete across line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        myExtension.setConfig(ConfigurationProvider.getDefaultConfiguration())

        let sampleText =
            "public\n"
            + "static\n"
            + "\n"
            + "void\n"
            + "\n"
            + "\n"
            + "            main";
        return InsertSampleText(sampleText);
    });

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

    // public
    // |static
    // =>
    // public|static
    test("No Skip line, No Leading Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 0), new Position(1, 0));
        editor.selection = selection;

        await ExecuteHungryDelete("No Skip line, No Leading Space");

        let text = getText(0, 0, 0, 12);
        assert.equal(text, "publicstatic");
    });

    // public
    // static
    //
    // |void
    // =>
    // public
    // static|void
    test("Skip line, No Leading Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(3, 0), new Position(3, 0));
        editor.selection = selection;
        await ExecuteHungryDelete("Skip line, No Leading Space");

        let text = getText(1, 0, 1, 10);
        assert.equal(text, "staticvoid");
    });

    // public
    // static
    //
    // void
    //
    //
    //          |main
    // =>
    // public
    // static
    //
    // void|main
    test("Skip line, With Leading Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(6, 12), new Position(6, 12));
        editor.selection = selection;
        await ExecuteHungryDelete("Skip line, With Leading Space");

        let line = getText(3, 0, 3, 8);
        assert.equal(line, "voidmain");
    });

    // public
    // static
    //
    // void
    //
    // |
    //          main
    // =>
    // public
    // static
    //
    // void|
    //          main
    test("Empty Line", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(5, 0), new Position(5, 0));
        editor.selection = selection;
        await ExecuteHungryDelete("Empty Line");

        let line = getText(4, 12, 4, 16);
        assert.equal(line, "main");
    });

    // public
    // |static
    //
    // |void
    //
    //
    //          |main
    // =>
    // publicstaticvoidmain
    test("Multiple Cursors", async () => {
        let editor = window.activeTextEditor;

        let selection1 = new Selection(new Position(1, 0), new Position(1, 0));
        let selection2 = new Selection(new Position(3, 0), new Position(3, 0));
        let selection3 = new Selection(new Position(6, 12), new Position(6, 12));
        editor.selections = [selection1, selection2, selection3];

        await ExecuteHungryDelete("Mutliple Cursors");

        let line = getText(0, 0, 0, 20);
        assert.equal(line, "publicstaticvoidmain");
    });

});

suite("Hungry Delete on line", () => {
    // Inesrt the sample text for each text case
    setup(() => {
        let sampleText =
            "public static void  main\n"
            + "public static void  main \n"
            + "public static void  main  \n"
            + "let a = b;\n"
            + "let a == b;\n"
            + "!!??abc\n";
        return InsertSampleText(sampleText);
    });

    //    public static void  main|
    // => public static void  |
    test("Delete World Left, End of Line, No Space", async () => {
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(0);
        let eol = line.range.end;

        editor.selection = new Selection(eol, eol);

        await ExecuteHungryDelete("Delete World Left, End of Line, No Space");

        let text = getText(0, 0, 0, 20);
        assert.equal(text, "public static void  ");
    });

    //    public static void  main |
    // => public static void  |
    test("Delete World Left, End of Line, One Space", async () => {
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(0);
        let eol = line.range.end;

        editor.selection = new Selection(eol, eol);

        await ExecuteHungryDelete("Delete World Left, End of Line, One Space");

        let text = getText(1, 0, 1, 20);
        assert.equal(text, "public static void  ");
    });

    //    public static void  main  |
    // => public static void  main|
    test("Delete World Left, End of Line, Two or More Space", async () => {
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(0);
        let eol = line.range.end;

        editor.selection = new Selection(eol, eol);

        await ExecuteHungryDelete("Delete World Left, End of Line, Two or More Space");

        let text = getText(2, 0, 2, 24);
        assert.equal(text, "public static void  main");
    });

    //    public static |void main
    // => public |void main
    test("Delete World Left, Head of right word, One Space", async () => {
        let editor = window.activeTextEditor;
        let position = new Position(0, 14);
        editor.selection = new Selection(position, position);

        await ExecuteHungryDelete("Delete World Left, Head of right word, One Space");

        let text = getText(0, 0, 0, 17);
        assert.equal(text, "public void  main");
    });

    //    public static void  |main
    // => public static void|main
    test("Delete World Left, Head of right word, Two or more Space", async () => {
        let editor = window.activeTextEditor;
        let position = new Position(0, 20);
        editor.selection = new Selection(position, position);

        await ExecuteHungryDelete("Delete World Left, Head of right word, Two or more Space");

        let text = getText(0, 0, 0, 22);
        assert.equal(text, "public static voidmain");
    });

    // let a = |b;
    // => let a |b;
    test("Delete Single Operator", async () => {
        let editor = window.activeTextEditor;

        const lineIdx = 3;
        let selection = new Selection(new Position(lineIdx, 8), new Position(lineIdx, 8));
        editor.selection = selection;
        await ExecuteHungryDelete("Delete Single Operator");

        let text = getText(lineIdx, 0, lineIdx, 8);
        assert.equal(text, "let a b;");
    });

    // let a == |b;
    // => let a |b;
    test("Delete Two Continuous Operator", async () => {
        let editor = window.activeTextEditor;

        const lineIdx = 4;
        let selection = new Selection(new Position(lineIdx, 9), new Position(lineIdx, 9));
        editor.selection = selection;
        await ExecuteHungryDelete("Delete Two Continuous Operator");

        let text = getText(lineIdx, 0, lineIdx, 8);
        assert.equal(text, "let a b;");
    });

    // !!??|abc
    // !!|abc
    test("Delete Different Operator", async () => {
        let editor = window.activeTextEditor;

        const lineIdx = 5;
        let selection = new Selection(new Position(lineIdx, 4), new Position(lineIdx, 4));
        editor.selection = selection;
        await ExecuteHungryDelete("Delete Different Operator");

        let text = getText(lineIdx, 0, lineIdx, 5);
        assert.equal(text, "!!abc");
    });
});

suite("Smart backspace on line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        let sampleText =
            "abcd\n"
            + "a bcd\n"
            + "if () {\n"
            + "if (a) {\n";
        return InsertSampleText(sampleText);
    });

    // a|bcd
    // => bcd
    test("Delete Single Letter", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(0, 1), new Position(0, 1));
        editor.selection = selection;
        await ExecuteSmartBackspace("Delete Single Letter");

        let text = getText(0, 0, 0, 3);
        assert.equal(text, "bcd");
    });

    // a |bcd
    // => abcd
    test("Delete Single Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 2), new Position(1, 2));
        editor.selection = selection;
        await ExecuteSmartBackspace("Delete Single Space");

        let text = getText(1, 0, 1, 4);
        assert.equal(text, "abcd");
    });

    // if (|) {
    // => if | {
    test("Delete One Pair", async () => {
        let editor = window.activeTextEditor;

        const lineIdx = 2;
        let selection = new Selection(new Position(lineIdx, 4), new Position(lineIdx, 4));
        editor.selection = selection;
        await ExecuteSmartBackspace("Delete One Pair");

        let text = getText(lineIdx, 0, lineIdx, 5);
        assert.equal(text, "if  {");
    });

    // if (|a) {
    // => if |a) {
    test("Not Delete One Pair if not empty", async () => {
        let editor = window.activeTextEditor;

        const lineIdx = 3;
        let selection = new Selection(new Position(lineIdx, 4), new Position(lineIdx, 4));
        editor.selection = selection;
        await ExecuteSmartBackspace("Not Delete One Pair if not empty");

        let text = getText(lineIdx, 0, lineIdx, 7);
        assert.equal(text, "if a) {");
    });
});

suite("Smart backspace above line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        let sampleText =
            "a\n"
            + "b\n"
            + "     \n"
            + "c \n"
            + "d"
        return InsertSampleText(sampleText);
    });

    // a<EOL>
    // |b
    // => ab<EOL>
    test("No Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 0), new Position(1, 0));
        editor.selection = selection;
        myExtension.setConfig({
            KeepOneSpace: false,
            CoupleCharacters: ConfigurationProvider.CoupleCharacters
        });
        await ExecuteSmartBackspace("No Space");

        let text = getText(0, 0, 0, 3);
        assert.equal(text, "ab");
    });

    // a<EOL>
    // |b
    // => a b<EOL>
    test("Keep One Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 0), new Position(1, 0));
        editor.selection = selection;
        myExtension.setConfig({
            KeepOneSpace: true,
            CoupleCharacters: ConfigurationProvider.CoupleCharacters
        });
        await ExecuteSmartBackspace("Keep One Space");

        let text = getText(0, 0, 0, 4);
        assert.equal(text, "a b");
    });

    // b<EOL>
    // |
    // c <EOL>
    // =>
    // b<EOL>
    // c <EOL>
    test("Keep One Space But Empty Line", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(2, 0), new Position(2, 0));
        editor.selection = selection;
        myExtension.setConfig({
            KeepOneSpace: true,
            CoupleCharacters: ConfigurationProvider.CoupleCharacters
        });
        await ExecuteSmartBackspace("Keep One Space But Empty Line");

        assert.equal(getText(1, 0, 1, 1), "b");
        assert.equal(getText(2, 0, 2, 2), "c ");
    });

    // c <EOL>
    // d<EOL>
    // =>
    // c d<EOL>
    test("Keep One Space But above line has space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(4, 0), new Position(4, 0));
        editor.selection = selection;
        myExtension.setConfig({
            KeepOneSpace: true,
            CoupleCharacters: ConfigurationProvider.CoupleCharacters
        });
        await ExecuteSmartBackspace("Keep One Space But above line has space");

        assert.equal(getText(3, 0, 3, 3), "c d");
    });
});
