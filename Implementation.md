# Implementation Note

This command aims to be backward compatible with existing implementation of `ctrl+backspace` a.k.a `deleteWorldLeft` 
because existing `ctrl+backspace` actually is a hungry delete on the same line with some optimizations
for source code editing.

In the previous version which supports only a single cursor, the code just invokes `deleteWordLeft` command to delete the word before the cursor.
In order to support multiple cursors, I need to invoke **each** cursor to `deleteWorldLeft`, but I can't find any API available so I write a mock implementation of `deleteWorldLeft`. 

## Optimisations for source code editing.

As mentioned before, the existing `ctrl+backspace` is a hungry delete inline with some optimizations. The examples use the following syntax to illustrates the ideas

- |: the cursor position
- => : (after pressing ctrl+backspace)
- Trivial : Trivial deleteWordLeft
- VSC: Visual Studio Code existing deleteWordLeft
- Current: Current implementation that is not the same as VSC

### World separators

Visual Studio Code a.k.a VSC have configurable world separators (e.g. @ or =), which will be stopped in `deleteWorldLeft` 
Example:

- Trivial:  "This is @@myName|"  => "This is |"
- VSC:  "This is @@myName|"  => "This is @@|"

### Delete continuous world separators util non world separator

Example:

- Trivial:  "This is @@|"  =>  "This is @|"
- VSC:  "This is @@|"  => "This is |"

Example 2:

- Trivial:  "This is My@@|"  =>  "This is |"
- VSC:  "This is My@@|"  => "This is My|"

Example 3: (This feature is not yet implemented)

- Trivial:  "This is My@@==|"  =>  "This is "
- VSC:  "This is My@@==|"  => "This is My|"
- Current:  "This is My@@==|"  => "This is My@@|" =>  => "This is My|"

### Delete one whitespace with the previous word

If there is **ONLY** a white space before the cursor, VSC `deleteWordLeft` will delete the whitespace with the previous word.
Example:

- Trivial:  "This is |"  => "This is|"
- VSC:  "This is |"  => "This |"

## Limitation of API

~~- Only can register the word pattern but it cannot be retrieved~~

After a few months I found out that the API actually [can retrieve the word pattern](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nameworkspaceconfigurationaspan-classcodeitem-id867workspaceconfigurationspan), I think the current implementation is acceptable and I am lazy to change it, but I am welcome with the pull request.

- The word range is undefined when the cursor is placed at word separators

## Research

https://github.com/microsoft/vscode/blob/dce493cb6e36346ef2714e82c42ce14fc461b15c/src/vs/workbench/api/common/extHostDocumentData.ts#L217

https://github.com/microsoft/vscode/blob/0a435fb5b173b2b793b3c54a5c3dfdf81b7caee5/src/vs/editor/common/cursor/cursorWordOperations.ts#L380

https://github.com/microsoft/vscode/blob/0a435fb5b173b2b793b3c54a5c3dfdf81b7caee5/src/vs/editor/common/core/wordCharacterClassifier.ts#L15