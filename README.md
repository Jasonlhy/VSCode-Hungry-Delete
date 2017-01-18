# Hungry Delete Extension for Visual Studio Code
Hungry Delete Extension for Visual Studio Code

I find it very annoying to press backspace multiple times to remove the leading tabs or whitespaces in order to return to the previos end of the line. 
Therefore, I create this extension and it overrides `ctrl+backspace` key binding, once `ctrl+backspace` is pressed, a command is executed.

# Features
`ctrl+backspace` to delete **ALL** tab or whitespaces before the cursor, until it reaches a non empty character.

## Before installing Hungry Delete
You have to press `ctrl+backspace` multiple times to delete the leading spaces and tabs

![BeforeExtension](images/before.gif)

## After intalling Hungry Delete
You have to press `ctrl+backspace` **ONCE** only to delete the leading spaces and tabs until you reaches a non-empty character

![AfterExtension](images/after.gif)

## Even support multiple cursor
![multiple_cursor](images/multiple.gif)

# Development
1. `git clone https://github.com/Jasonlhy/VSCode-Hungry-Delete.git`
2. `npm install`
3. Edit `src/extension.ts`

# Implementation Note
This command aims to be backward compatiable with exisiting implementation of `ctrl+backspace` a.k.a `deleteWorldLeft` 
becasue exisiting `ctrl+backspace` actually is a hungry delete on the same line with some optimizations
for source code editings.

In previous version which supports only a single cursor, the code just invokes `deleteWordLeft` command to delete the word before the cursor.
In order to To support multiple cursors, I need to invoke **each** cursor to `deleteWorldLeft`, but I can't find any API available 
so I write a mock implementation of `deleteWorldLeft`. 

## Optimizations for source code editings.
As mentioned before, the exisiting `ctrl+backspace` is a hungry delete inline with some optimizations. The examples uses following syntax to illustrates the ideas
- | : the cursor position
- => : (after pressing ctrl+backspace)
- Trivial : Trivial deleteWordLeft
- VSC : Visual Studio Code exisiting deleteWordLeft
- Current : Current implementation that is not the same as VSC

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

### Delete a whitespace with previous word
If there is **ONLY** a white space before the cursor, VSC `deleteWordLeft` will delete the whitespace with previous word.
Example:
- Trivial:  "This is |"  => "This is|"
- VSC:  "This is |"  => "This |"

## Limitation of API
- Only can register the word pattern but it cannot be retrieved
- The word range is undefined for word separators

# Change the key binding
By default, hungry delete command maps to `ctrl+backspace` on windows and linux, `alt+backspace` on mac.
The following snippet can be placed inside `keybings.json` file to override the default key binding,
it sets `ctrl+shift+backspace` for the command.

```json
{
        "key": "ctrl+shift+backspace",
        "command": "extension.hungryDelete",
        "when": "editorTextFocus && !editorReadonly"
}
```
# Reference
The term **Hungry Delete** comes from [Enacs](http://www.gnu.org/software/emacs/manual/html_node/emacs/Hungry-Delete.html)