# Change Log
All notable changes to the "Hungry Delete" extension will be documented in this file.

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
- Able to override `ctrl+backspace` in key binding to run the hundry delete command, the cursor located at the empty line will move up to find the last non-empty character.