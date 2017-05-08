# Hungry Delete Extension for Visual Studio Code
Hungry Delete Extension for Visual Studio Code

I find it very annoying to press backspace multiple times to remove the leading tabs or whitespaces in order to return to the previos end of the line. 

Therefore, I created this extension, it overrides `ctrl+backspace` key binding, once `ctrl+backspace` is pressed, a command is executed. 

Later I found that sometime I just want to delete the upper line and keep the indent (Personally I don't use backspace to adjust the indent, I use `ctrl+[`), so I added the smart backspace feafure which overrides `backspace`.

# Features

## Hungry Delete

To delete **ALL** tab or whitespaces before the cursor, until it reaches a non empty character.

- Windows and Linux : Press `ctrl+backspace` 
- Mac : Press `alt+backspace`

## Smart Backspace
To delete upper empty line or delete all tabs or whitespaces until the end of the previous line.

- Windows and Linux and Mac : Press `backspace` 

# Hungry Delete Demo

## Before Hungry Delete
You have to press `ctrl+backspace` multiple times to delete the leading spaces and tabs

![Before Hungry Delete](images/before.gif)

## After Hungry Delete
You only have to press `ctrl+backspace` **ONCE** to delete the leading spaces and tabs until you reaches a non-empty character

![After Hungry Delete](images/after.gif)

## Support Multiple Cursor

![Hugry Delete Multiple Cursor](images/multiple.gif)

# Smart Backspace Demo

## Before Smart Backspace

You have to press `backspace` multiple times to delete the leading tabs or space to upper line. (Or press upper arrow and press `ctrl+k`)

![Before Smart Backspace](images/before_smartbackspace.gif)

## After Smart Backspace

You have to press `backspace` once

![After Smart Backspace](images/after_smartbackspace.gif)

## Support Multiple Cursor

![Smart Backspace Multiple Cursor](images/smartbackspace_multicursor.gif)

# Development
1. `git clone https://github.com/Jasonlhy/VSCode-Hungry-Delete.git`
2. `npm install`
3. Edit `src/extension.ts`

# Conflict With Vim Extension
Becasue [Vim extension](https://marketplace.visualstudio.com/items?itemName=jasonlhy.hungry-delete) define its own command for `ctrl+backspace` and `backspace`. To work with [Vim extension](https://marketplace.visualstudio.com/items?itemName=jasonlhy.hungry-delete), you have to explicitly define these two key bindings map to the commands of this extension by adding following code snippet into `keybindings.json`

```json
    {
        "key": "backspace",
        "command": "extension.smartBackspace",
        "when": "config.hungryDelete.enableSmartBackspace && editorTextFocus && !editorReadonly"
    },
    {
        "key": "ctrl+backspace",
        "command": "extension.hungryDelete",
        "when": "editorTextFocus && !editorReadonly"
    }
```

## Steps

1. Click "No" if VSCode detected that this extension have conflict with Vim extension

    ![Conflict](images/conflict.png)

2. Add setting into `keybindings.json`

    ![Step 1](images/key1.png)

    ![Step 2](images/key2.png)

    ![Step 3](images/key3.png)

# Implementation Note
This command aims to be backward compatiable with exisiting implementation of `ctrl+backspace` a.k.a `deleteWorldLeft` 
becasue exisiting `ctrl+backspace` actually is a hungry delete on the same line with some optimizations
for source code editings.

In previous version which supports only a single cursor, the code just invokes `deleteWordLeft` command to delete the word before the cursor.
In order to support multiple cursors, I need to invoke **each** cursor to `deleteWorldLeft`, but I can't find any API available 
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
~~- Only can register the word pattern but it cannot be retrieved~~

After a fews month I found out that the API actually [can retrieve the word pattern](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nameworkspaceconfigurationaspan-classcodeitem-id867workspaceconfigurationspan), I think current implementation is acceptable and I am lazy to change it, but I am welcome with pull request.

- The word range is undefined when the cursor is placed at word separators

# Setting

## Change the key binding
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

## Disable smart backspace

To disable smart backspace, just set `hungryDelete.enableSmartBackspace` to be false in setting.

```json
{
    "hungryDelete.enableSmartBackspace" : false
}
```
# Reference
The term **Hungry Delete** comes from [Emacs](http://www.gnu.org/software/emacs/manual/html_node/emacs/Hungry-Delete.html)

The term **Smart Backspace** comes from [PhpStorm](https://blog.jetbrains.com/phpstorm/2014/09/smart-backspace-in-phpstorm-8/)