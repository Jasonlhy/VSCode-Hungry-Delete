// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { window, Position, Selection } from 'vscode';
import { executeHungryDelete, getText, insertSampleText } from '../helper/testHelper';

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
        return insertSampleText(sampleText);
    });

    //    public static void  main|
    // => public static void  |
    test("Delete World Left, End of Line, No Space", async () => {
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(0);
        let eol = line.range.end;

        editor.selection = new Selection(eol, eol);

        await executeHungryDelete("Delete World Left, End of Line, No Space");

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

        await executeHungryDelete("Delete World Left, End of Line, One Space");

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

        await executeHungryDelete("Delete World Left, End of Line, Two or More Space");

        let text = getText(2, 0, 2, 24);
        assert.equal(text, "public static void  main");
    });

    //    public static |void main
    // => public |void main
    test("Delete World Left, Head of right word, One Space", async () => {
        let editor = window.activeTextEditor;
        let position = new Position(0, 14);
        editor.selection = new Selection(position, position);

        await executeHungryDelete("Delete World Left, Head of right word, One Space");

        let text = getText(0, 0, 0, 17);
        assert.equal(text, "public void  main");
    });

    //    public static void  |main
    // => public static void|main
    test("Delete World Left, Head of right word, Two or more Space", async () => {
        let editor = window.activeTextEditor;
        let position = new Position(0, 20);
        editor.selection = new Selection(position, position);

        await executeHungryDelete("Delete World Left, Head of right word, Two or more Space");

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
        await executeHungryDelete("Delete Single Operator");

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
        await executeHungryDelete("Delete Two Continuous Operator");

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
        await executeHungryDelete("Delete Different Operator");

        let text = getText(lineIdx, 0, lineIdx, 5);
        assert.equal(text, "!!abc");
    });
});
