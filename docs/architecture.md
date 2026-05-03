# Architecture Guide

## Overview

Solution Workbench is a VS Code extension that provides a Visual Studio-style Solution Explorer for `.sln` and `.slnx` files. It supports both .NET (SDK-style) and C++ (MSBuild-based) project workflows.

## Directory Structure

```
src/
├── extension.ts                    # Entry point: activate/deactivate
├── SolutionExplorerProvider.ts     # TreeDataProvider implementation
├── SolutionExplorerCommands.ts     # Command registration and routing
├── SolutionFinder.ts               # Solution discovery and state management
├── SolutionTreeItemCollection.ts   # Root-level tree item collection
├── SolutionExplorerFileWatcher.ts  # File system change monitoring
├── SolutionExplorerDragAndDropController.ts  # Drag-and-drop handling
├── SolutionExplorerOutputChannel.ts # Output channel for logs
├── OmnisharpIntegrationService.ts  # Omnisharp event integration
├── ActionsRunner.ts                # Sequential action executor
│
├── core/
│   ├── Solutions/                  # Solution file parsing (.sln, .slnx)
│   │   ├── SolutionFactory.ts      # Factory for loading solutions
│   │   ├── sln/SolutionFile.ts     # Classic .sln file parser
│   │   └── slnx/SlnxSolutionFile.ts # XML-based .slnx parser
│   ├── Projects/                   # Project file handling
│   │   ├── Project.ts              # Abstract base class
│   │   ├── ProjectFactory.ts       # Factory for parsing project files
│   │   ├── MsBuildProject.ts       # Standard MSBuild project (.vcxproj, .csproj)
│   │   ├── ProjectWithManagers.ts  # Project with XML and file managers
│   │   └── Managers/
│   │       ├── XmlManager.ts       # XML project file manipulation
│   │       └── FileManager.ts      # File system operations for projects
│   ├── DirectoryPackages/          # Directory.Packages.props support
│   └── Utilities/                  # File search utilities
│
├── tree/
│   ├── TreeItem.ts                 # Base tree item (extends vscode.TreeItem)
│   ├── TreeItemFactory.ts          # Factory for creating tree items
│   ├── TreeItemContext.ts          # Context passed to tree items
│   ├── ContextValues.ts            # Context value constants for menu visibility
│   ├── TreeItemIconProvider.ts     # Icon resolution
│   └── items/
│       ├── SolutionTreeItem.ts     # Root solution node
│       ├── ProjectTreeItem.ts      # Base project node
│       ├── standard/StandardProjectTreeItem.ts  # MSBuild project node
│       ├── cps/CpsProjectTreeItem.ts            # SDK-style project node
│       ├── ProjectFolderTreeItem.ts
│       ├── ProjectFileTreeItem.ts
│       └── ...                     # References, packages, etc.
│
├── commands/                       # Command implementations
│   ├── ActionsCommand.ts           # Base command class
│   ├── BuildCommand.ts             # Build via dotnet or MSBuild
│   ├── RunCppProjectCommand.ts     # Run executable C++ projects
│   ├── DebugCppProjectCommand.ts   # Debug via cppvsdbg
│   ├── ConfigureCppProjectCommand.ts # Project properties UI
│   ├── ActivateSolutionCommand.ts  # Switch active solution
│   ├── SwitchWorkspaceForSolutionCommand.ts  # Set source directory
│   └── ...                         # 30+ command implementations
│
├── actions/                        # Action implementations (executed by ActionsRunner)
│   ├── MsBuildBuild.ts             # MSBuild /t:Build action
│   ├── DotNetBuild.ts              # dotnet build action
│   └── ...
│
├── extensions/                     # Utility modules
│   ├── buildRunner.ts              # MSBuild process manager
│   ├── runTracker.ts               # Run/debug process tracker
│   ├── msvcDetector.ts             # Visual Studio / MSBuild detection
│   ├── config.ts                   # Settings access
│   ├── i18n.ts                     # Internationalization
│   ├── logger.ts                   # Logging helpers
│   ├── fs.ts                       # File system helpers
│   ├── xml.ts                      # XML parsing/serialization
│   ├── terminal.ts                 # Terminal command execution
│   └── nuget.ts                    # NuGet API client
│
├── events/                         # Event aggregation system
│   ├── EventAggregator.ts
│   ├── file/FileEvent.ts
│   ├── log/LogEvent.ts
│   └── solution/SolutionSelected.ts
│
├── language/                       # Language features for project files
│   ├── completions/                # NuGet name/version completions
│   ├── decorators/                 # Version inline decorators
│   └── actions/                    # Code actions for NuGet updates
│
├── templates/                      # File creation templates
│   ├── TemplateEngine.ts
│   └── HandlebarsTemplateEngine.ts
│
└── logs/                           # Logger interface
```

## Key Concepts

### Project Types

Projects are categorized by their project system:

| Type | Context Value | Description |
|------|---------------|-------------|
| SDK-style (.NET) | `project-cps` | Modern .csproj/.fsproj with `<Project Sdk="...">` |
| Standard (MSBuild) | `project-standard` | Classic .vcxproj or old-style .csproj |
| Standard Executable | `project-standard-exe` | Standard project with `ConfigurationType=Application` |

The `project-standard-exe` distinction is used to conditionally show Run/Debug buttons only for executable projects. Static libraries and DLLs use plain `project-standard`.

### Context Values

Context values (`contextValue` on TreeItem) control which commands appear in menus. Key suffixes:

- `-building`: Project is currently being built
- `-running`: Project is currently running
- `-inactive`: Solution is not the active one
- `-exe`: Project produces an executable (Application)
- `-cps`: SDK-style project
- `-standard`: Classic MSBuild project

The `ContextValues.both()` helper generates arrays covering all relevant variants for a given base context.

### Solution State Management

`SolutionFinder` manages:
- **Managed solutions list**: persisted in workspace/global state
- **Active solution**: which solution is currently active (only one at a time)
- **Workspace root bindings**: maps solution paths to source directories

State is persisted via `vscode.Memento` (both workspace and global state) so it survives restarts.

### Build Pipeline

1. `BuildCommand` determines whether to use MSBuild or dotnet CLI based on project extension
2. For MSBuild: `MsBuildBuild` action constructs the command line, `buildRunner.executeBuild()` spawns the process
3. `buildRunner` manages the subprocess lifecycle, output parsing, and context state (`solutionExplorer.buildInProgress`)
4. The tree item's `contextValue` is temporarily changed to `*-building` during builds

### Run/Debug Pipeline

1. `RunCppProjectCommand` / `DebugCppProjectCommand` resolve the output executable path
2. Resolution order: build output cache -> MSBuild evaluation -> XML parsing -> prompt to build
3. For Run: `runTracker.executeRun()` spawns the process
4. For Debug: `vscode.debug.startDebugging()` with `cppvsdbg` configuration
5. `runTracker` manages process state and `solutionExplorer.runOrDebugInProgress` context

### MSVC Detection

`msvcDetector.ts` finds Visual Studio installations:
1. Try `vswhere.exe` (official VS installer tool)
2. Fallback to manual filesystem scan of known paths
3. Cache `MSBuild.exe` path and platform toolset version
4. Parse `.vcxproj` for `ConfigurationType`, `OutDir`, `TargetName`, `TargetExt`

## Build & Development

```bash
npm install          # Install dependencies
npm run compile      # Build (development mode)
npm run watch        # Build with file watcher
npm run package      # Create .vsix package
```

Or use `build.bat` for a one-step build with auto version increment.

### Debugging the Extension

1. Open this project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open a folder containing a `.sln` file in the dev host

### webpack Configuration

The extension uses webpack to bundle all source into a single `out/extension.js`. Key config:
- Target: `node` (VS Code extension host)
- Externals: `vscode` module
- Path aliases via `tsconfig.json` paths (e.g., `@core/*`, `@extensions/*`)
