// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { window, Position, Selection } from 'vscode';
import * as myExtension from '../../src/extension';
import { ConfigurationProvider } from '../../src/ConfigurationProvider';
import { executeHungryDelete, getText, insertSampleText } from '../helper/testHelper';

suite("Hungry Delete across line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        myExtension.setConfig(ConfigurationProvider.getDefaultConfiguration());

        let sampleText =
            "public\n"
            + "static\n"
            + "\n"
            + "void\n"
            + "\n"
            + "\n"
            + "            main";
        return insertSampleText(sampleText);
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

        await executeHungryDelete("No Skip line, No Leading Space");

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
        await executeHungryDelete("Skip line, No Leading Space");

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
        await executeHungryDelete("Skip line, With Leading Space");

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
        await executeHungryDelete("Empty Line");

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

        await executeHungryDelete("Mutliple Cursors");

        let line = getText(0, 0, 0, 20);
        assert.equal(line, "publicstaticvoidmain");
    });

});

