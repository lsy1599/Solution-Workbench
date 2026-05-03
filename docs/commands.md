# Commands Reference

## Solution Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.openSolution` | Open Solution | Global |
| `solutionExplorer.addSolution` | Add Solution | Global toolbar |
| `solutionExplorer.closeSolution` | Close Solution | Solution node |
| `solutionExplorer.activateSolution` | Activate Solution | Solution node |
| `solutionExplorer.switchWorkspaceForSolution` | Set Source Directory | Solution node |
| `solutionExplorer.createNewSolution` | Create New Empty Solution | No-solution welcome |
| `solutionExplorer.openSelectedSolution` | Open in Solution Explorer | File explorer (.sln) |

## Build Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.build` | Build | Solution/Project (context menu) |
| `solutionExplorer.clean` | Clean | Solution/Project (context menu) |
| `solutionExplorer.rebuild` | Rebuild | Solution/Project (context menu) |
| `solutionExplorer.inlineBuild` | Build | Solution/Project (inline icon) |
| `solutionExplorer.inlineRebuild` | Rebuild | Solution/Project (inline icon) |
| `solutionExplorer.cancelBuild` | Cancel Build | During build |

## C++ Project Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.runCppProject` | Run | Executable project only |
| `solutionExplorer.debugCppProject` | Debug | Executable project only |
| `solutionExplorer.configureCppProject` | Properties | Any standard project |
| `solutionExplorer.openOutputFolder` | Open Output Folder | Any standard project |
| `solutionExplorer.openTerminalAtProject` | Open Terminal Here | Any project |
| `solutionExplorer.stopRun` | Stop | During run/debug |
| `solutionExplorer.selectMsvcToolchain` | Select MSVC Toolchain | Global |

## .NET Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.run` | Run | CPS project |
| `solutionExplorer.watchRun` | Watch Run | CPS project |
| `solutionExplorer.test` | Test | CPS project |
| `solutionExplorer.pack` | Pack | CPS project |
| `solutionExplorer.publish` | Publish | CPS project |
| `solutionExplorer.restore` | Restore | CPS project |

## File/Folder Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.createFile` | Create File | Project/Folder |
| `solutionExplorer.createFolder` | Create Folder | Project/Folder |
| `solutionExplorer.renameFile` | Rename | File |
| `solutionExplorer.renameFolder` | Rename | Folder |
| `solutionExplorer.deleteFile` | Delete | File |
| `solutionExplorer.deleteFolder` | Delete | Folder |
| `solutionExplorer.moveFile` | Move to Folder | File |
| `solutionExplorer.moveFolder` | Move to Folder | Folder |
| `solutionExplorer.copy` | Copy | File/Folder |
| `solutionExplorer.paste` | Paste | Project/Folder |
| `solutionExplorer.duplicate` | Create a Copy | File |
| `solutionExplorer.openFile` | Open File | File/Project |
| `solutionExplorer.revealFileInOS` | Reveal in OS | File |

## Package/Reference Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.addPackage` | Add Package | CPS project |
| `solutionExplorer.removePackage` | Remove Package | Package node |
| `solutionExplorer.updatePackageVersion` | Update Package Version | Package node |
| `solutionExplorer.updatePackagesVersion` | Update All Packages | Project/Packages node |
| `solutionExplorer.addProjectReference` | Add Reference | CPS project |
| `solutionExplorer.removeProjectReference` | Remove Reference | Reference node |

## Project Management Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `solutionExplorer.addNewProject` | Add New Project | Solution node |
| `solutionExplorer.addExistingProject` | Add Existing Project | Solution node |
| `solutionExplorer.removeProject` | Remove from Solution | Project node |
| `solutionExplorer.createSolutionFolder` | Create Folder | Solution node |
| `solutionExplorer.removeSolutionFolder` | Remove | Solution folder |
| `solutionExplorer.renameSolutionItem` | Rename | Solution/Project/Folder |
| `solutionExplorer.moveToSolutionFolder` | Move | Project/Folder |

## Visibility Rules

Run/Debug commands are **only visible** for executable projects (`project-standard-exe`). Projects producing static libraries (`.lib`) or dynamic libraries (`.dll`) do not show Run/Debug buttons.

Build/Rebuild/Clean/Properties/OpenOutputFolder are visible for **all standard projects** regardless of output type.
