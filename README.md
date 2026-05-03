# Solution Workbench

A powerful Visual Studio Solution Explorer for VS Code / Cursor, providing full support for `.sln` and `.slnx` solution files with C++ MSBuild and .NET project workflows.

## Features

### Solution Management
- Open and browse `.sln` / `.slnx` solution files directly in VS Code
- Support multiple solutions simultaneously with solution activation
- Create new solutions and add/remove projects
- Drag-and-drop support for moving files, folders, and projects within solutions
- Solution folder management (create, rename, move, delete)

### C++ / MSVC Build Integration
- Auto-detect Visual Studio and MSBuild installations (2015–2022)
- Build, Rebuild, and Clean projects/solutions via MSBuild
- Configurable build settings: Configuration (Debug/Release), Platform (Win32/x64/ARM/ARM64), Verbosity, Toolset
- Real-time build output in a dedicated output channel
- Cancel running builds with one click

### Run & Debug (Executable Projects Only)
- Run executable projects directly from the tree view
- Debug with `cppvsdbg` (requires C/C++ extension)
- Run and Debug buttons are shown **only for executable (.exe) projects** — static libraries and DLLs do not display these actions
- Configure command-line arguments and working directory per project
- Stop running processes from the toolbar

### .NET / SDK-Style Project Support
- Full support for `.csproj`, `.fsproj`, `.vbproj` SDK-style projects
- NuGet package management: add, remove, update packages
- Project reference management
- dotnet CLI integration: build, clean, run, watch, test, pack, publish, restore
- NuGet package version decorators and code completions in project files

### Source Directory Mapping
- Set custom source directories for each solution
- Automatically switch VS Code workspace when activating a solution with a bound source directory
- Persistent mapping across sessions

### File Management
- Create, rename, delete, move files and folders within projects
- Copy/paste and duplicate files
- File creation from customizable templates (C#, TypeScript, VB, etc.)
- Support for `.vcxproj.filters` file organization (header files, source files, etc.)

### Other Features
- Multi-language support (English and Simplified Chinese)
- Customizable icon themes (solution-explorer, current-theme, or mix)
- Activity bar or explorer pane display mode
- Track active editor file in the solution tree
- Keyboard shortcuts for common operations
- Syntax highlighting for `.sln` and `.slnx` files

## Requirements

- **VS Code** 1.99.1 or later
- **For C++ projects**: Visual Studio Build Tools or Visual Studio (2015 or later) with C++ workload
- **For .NET projects**: .NET SDK
- **For debugging**: [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) (ms-vscode.cpptools)

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a folder containing a `.sln` or `.slnx` file
3. The Solution Explorer panel appears in the Activity Bar (configurable)
4. Right-click solutions/projects for build, run, debug, and management options

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `vssolution.showMode` | Display location: `activityBar`, `explorer`, or `none` | `activityBar` |
| `vssolution.solutionExplorerIcons` | Icon style: `solution-explorer`, `current-theme`, or `mix` | `solution-explorer` |
| `vssolution.msbuildPath` | Custom MSBuild.exe path (auto-detected if empty) | `""` |
| `vssolution.msbuildConfiguration` | Build configuration (Debug/Release, auto-detect if empty) | `""` |
| `vssolution.msbuildPlatform` | Target platform (Win32/x64/ARM/ARM64, auto-detect if empty) | `""` |
| `vssolution.msbuildVerbosity` | MSBuild output verbosity | `minimal` |
| `vssolution.msbuildParallelBuild` | Enable parallel build (`/m` flag) | `true` |
| `vssolution.trackActiveItem` | Auto-select active editor file in tree | `false` |
| `vssolution.itemNesting` | Display related items nested | `false` |
| `vssolution.netcoreIgnore` | Folders/files to ignore | `["bin","node_modules","obj",".ds_store",".vs"]` |

See the full settings list in VS Code Settings under "Solution Workbench".

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Create file |
| `Ctrl+Shift+F` | Create folder |
| `F2` | Rename |
| `Delete` | Delete |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `Ctrl+Alt+L` | Focus Solution Explorer |
| `Ctrl+Shift+Alt+O` | Open Solution |
| `Ctrl+Enter` | Open file and focus editor |

## Known Issues

See the [Issues](https://github.com/simon/vscode-solution-explorer/issues) page.

## License

[MIT](LICENSE)
