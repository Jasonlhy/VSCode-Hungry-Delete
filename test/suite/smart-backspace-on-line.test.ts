// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { window, Position, Selection } from 'vscode';
import { executeSmartBackspace, getText, insertSampleText } from '../helper/testHelper';

suite("Smart backspace on line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        let sampleText =
            "abcd\n"
            + "a bcd\n"
            + "if () {\n"
            + "if (a) {\n";
        return insertSampleText(sampleText);
    });

    // a|bcd
    // => bcd
    test("Delete Single Letter", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(0, 1), new Position(0, 1));
        editor.selection = selection;
        await executeSmartBackspace("Delete Single Letter");

        let text = getText(0, 0, 0, 3);
        assert.equal(text, "bcd");
    });

    // a |bcd
    // => abcd
    test("Delete Single Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 2), new Position(1, 2));
        editor.selection = selection;
        await executeSmartBackspace("Delete Single Space");

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
        await executeSmartBackspace("Delete One Pair");

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
        await executeSmartBackspace("Not Delete One Pair if not empty");

        let text = getText(lineIdx, 0, lineIdx, 7);
        assert.equal(text, "if a) {");
    });
});