// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { window, Position, Selection } from 'vscode';
import * as myExtension from '../../src/extension';
import { ConfigurationProvider } from '../../src/ConfigurationProvider';
import { executeSmartBackspace, getText, insertSampleText } from '../helper/testHelper';

suite("Smart backspace above line", () => {
    // Inesrt the sample text for each text case
    // main with 12 leading spaces
    setup(() => {
        let sampleText =
            "a\n"
            + "b\n"
            + "     \n"
            + "c \n"
            + "d";
        return insertSampleText(sampleText);
    });

    // a<EOL>
    // |b
    // => ab<EOL>
    test("No Space", async () => {
        let editor = window.activeTextEditor;

        let selection = new Selection(new Position(1, 0), new Position(1, 0));
        editor.selection = selection;
        myExtension.setConfig({
            keepOneSpace: false,
            coupleCharacters: ConfigurationProvider.coupleCharacters
        });
        await executeSmartBackspace("No Space");

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
            keepOneSpace: true,
            coupleCharacters: ConfigurationProvider.coupleCharacters
        });
        await executeSmartBackspace("Keep One Space");

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
            keepOneSpace: true,
            coupleCharacters: ConfigurationProvider.coupleCharacters
        });
        await executeSmartBackspace("Keep One Space But Empty Line");

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
            keepOneSpace: true,
            coupleCharacters: ConfigurationProvider.coupleCharacters
        });
        await executeSmartBackspace("Keep One Space But above line has space");

        assert.equal(getText(3, 0, 3, 3), "c d");
    });
});
