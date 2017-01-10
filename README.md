# Hungry Delete Extension for Visual Studio Code
Hungry Delete Extension for Visual Studio Code

I find it very annoying to press backspace multiple time in order to remove the leading tabs or whitespaces in order to return to the previos end of the line. Therefore, I create this extension and it just overrides the `ctrl+backspace` key binding, once `ctrl+backspace` is pressed, a command is executed.

# Features
`ctrl+backspace` to delete **ALL** tab or whitespaces before the cursor, until it reaches a non empty character.

## Before installing Hungry Delete
You have to press `ctrl+backspace` multiple times to delete the leading spaces and tabs

![BeforeExtension](images/before.gif)

## After intalling Hungry Delete
You have to press `ctrl+backspace` **ONCE** only to delete the leading spaces and tabs until you reaches a non-empty character

![AfterExtension](images/after.gif)

# Development
1. `git clone https://github.com/Jasonlhy/VSCode-Hungry-Delete.git`
2. `npm install`
3. Edit `src/extension.ts`

# Reference
The term **Hungry Delete** comes from [Enacs](http://www.gnu.org/software/emacs/manual/html_node/emacs/Hungry-Delete.html)