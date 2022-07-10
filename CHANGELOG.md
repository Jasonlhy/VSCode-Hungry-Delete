# Change Log

All notable changes to the "Hungry Delete" extension will be documented in this file.


## [1.7.0] - 2022-07-10

### Added

- Better handling of hungry delete on line for special character such as ", less annoying when editing JSON file

Breaking change:
Setting: `followAbovelineIndent` is renamed into `followAboveLineIndent`

Note:
Migrate vscode version to 1.69

## [1.6.0] - 2019-04-23

### Added

- Consider increase indent pattern
- Follow Above Line Indent
- Keep One Space Exception

### Changed

- Refactored the codes a lot, may result in bugs, please leave issue if you find big problems.

## [1.5.0] - 2018-01-21

- Keep one space after last word of previous line after smart backspace
- Simplify some logic in code

## [1.4.1] - 2018-01-05

- Reveal the cursor in the view point if only one selection (credit to tiansin)

## [1.4.0] - 2017-11-16

- More hungry approach for let a = |b and a == |b, previously it only delete the space before it, it also delete the operator now
- Support delete entire auto closing pair if the content is empty and the cursor is put just before the opening pair. For example, (), {}, ``, ""

## [1.3.3] - 2017-05-13

- Fix bug: ** located at the start of the line cannot be deleted by ctrl+backspace because !0 is evaluated to false inside if()

## [1.3.2] - 2017-05-08

- Fix rare case when line.rangeIncludingLineBreak === line.range

## [1.3.1] - 2017-05-03

- Change README with Vim Compatibility

## [1.3.0] - 2017-05-03

- Support Smart Backspace

## [1.2.2] - 2017-01-22

### Fixed

- Fix `aaa |bbb` bug

## [1.2.0] - 2017-01-15

- Support multiple cursors

### Changed

- Use a mock implementation of `deleteWorldLeft` instead of invoking the editor command

### Fixed

- `ctrl + backspace` on visual selection don't delete the selection

## [1.1.0] - 2017-01-11

- Use a more robust backtrace algorithm to find the starting position of hungry delete, and use extension API such as TextEdit instead of directly calling command.

### Changed

- Hungry delete doesn't limit to empty line, it can now be used at the start of a non-empty line.

### Fixed

- Unable to delete the lines that should be hungry deleted (due to a typo in command's name)

## [1.0.0] - 2017-01-10

- Initial release
- Able to override `ctrl+backspace` in key binding to run the hungry delete command, the cursor located at the empty line will move up to find the last non-empty character.
