# Contributing Guide

## Prerequisites

- Node.js 18+
- npm 9+
- VS Code 1.99.1+
- For testing C++ features: Visual Studio 2019/2022 with C++ workload

## Setup

```bash
git clone https://github.com/simon/vscode-solution-explorer.git
cd vscode-solution-explorer
npm install
```

## Development Workflow

### Build

```bash
npm run compile     # One-time development build
npm run watch       # Continuous build with file watcher
```

### Debug

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the dev host, open a folder with a `.sln` file

### Package

```bash
npm run package     # Create .vsix file
# Or use the build script:
build.bat           # Windows: auto-increment version + build + package
```

## Code Structure

### Adding a New Command

1. Create a command class in `src/commands/` extending `SingleItemActionsCommand` or `ActionsCommand`
2. Register it in `SolutionExplorerCommands.ts` with allowed context values
3. Add the command definition in `package.json` under `contributes.commands`
4. Add menu entries in `package.json` under `contributes.menus`
5. Add localization keys in `package.nls.json` and `package.nls.zh-cn.json`

### Adding a New Action

Actions are the atomic units of work. Create in `src/actions/`:

1. Extend `Action` class
2. Implement `execute()` method
3. Export from `src/actions/index.ts`
4. Return the action from a command's `getActions()` method

### Modifying Context Values

Context values control menu visibility. When adding new project types or states:

1. Add constants in `src/tree/ContextValues.ts`
2. Update `ContextValues.both()` if the new value should appear alongside standard/cps variants
3. Update `when` clauses in `package.json`
4. Update command `shouldRun()` methods

### Internationalization

Add translation keys in:
- `src/extensions/i18n.ts` for runtime messages
- `package.nls.json` (English) and `package.nls.zh-cn.json` (Chinese) for package manifest strings

## Testing

### Manual Testing Checklist

- [ ] Open a .sln with multiple C++ projects (exe, lib, dll)
- [ ] Verify Run/Debug only appear on exe projects
- [ ] Build a project and verify output parsing
- [ ] Run and stop an executable
- [ ] Debug and verify breakpoint hit
- [ ] Switch between solutions and verify source directory restoration
- [ ] Create/rename/delete files and folders
- [ ] Add/remove NuGet packages (for .NET projects)
- [ ] Drag and drop files between folders

## Release Process

1. Run `build.bat` to auto-increment version, compile, and package
2. The `.vsix` file is placed in the `vsix/` directory
3. Upload to the VS Code Marketplace via `vsce publish` or manually
