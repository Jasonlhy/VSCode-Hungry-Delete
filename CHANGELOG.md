# Change Log
All notable changes to the "Hungry Delete" extension will be documented in this file.

## [1.1.0] - 2017-01-11
- Use a more robust backtrace algorithm to find the starting position of hungry delete, and use extension API such as TextEdit instead of directly calling command.

### Changed
- Hungry delete doesn't limit to empty line, it can now be used at the start of a non-empty line.

### Fixed
- Unable to delete the lines that should be hungry deleted (due to a typo in command's name)

## [1.0.0] - 2017-01-10
- Initial release
- Able to override `ctrl+backspace` in key binding to run the hundry delete command, the cursor located at the empty line will move up to find the last non-empty character.