import * as vscode from "vscode";
import * as cmds from "@commands";
import * as buildRunner from "@extensions/buildRunner";
import * as runTracker from "@extensions/runTracker";
import { t } from "@extensions/i18n";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SolutionFinder } from "./SolutionFinder";
import { IEventAggregator } from "@events";
import { TemplateEngineCollection } from "@templates";
import { ContextValues, TreeItem } from "@tree";
import { ActionsRunner } from "./ActionsRunner";
import { Direction } from "@core/Projects/RelativeFilePosition";

export class SolutionExplorerCommands {
    private commands: { [id: string]: [command: cmds.ActionsCommand, allowedContexts: string[] | undefined] } = {};

    constructor(private readonly context: vscode.ExtensionContext,
                private readonly provider: SolutionExplorerProvider,
                private readonly solutionFinder: SolutionFinder,
                private readonly actionsRunner: ActionsRunner,
                private readonly templateEngineCollection: TemplateEngineCollection,
                private readonly eventAggregator: IEventAggregator) {

        const { cps, both, fsharp, anyLang } = ContextValues;

        this.commands['addExistingProject'] = [new cmds.AddExistingProjectCommand(provider),
            both(ContextValues.solution)];

        this.commands['addNewProject'] = [new cmds.AddNewProjectCommand(provider),
            both(ContextValues.solution)];

        this.commands['addPackage'] = [new cmds.AddPackageCommand(),
            cps(ContextValues.project, ContextValues.projectReferencedPackages)];

        this.commands['updatePackageVersion'] = [new cmds.UpdatePackageVersionCommand(),
            cps(ContextValues.projectReferencedPackage)];

        this.commands['addProjectReference'] = [new cmds.AddProjectReferenceCommand(),
            cps(ContextValues.project, ContextValues.projectReferencedProjects)];

        this.commands['addSolutionFile'] = [new cmds.AddExistingFileToSolutionFolderCommand(),
            [ContextValues.solutionFolder]];

        this.commands['build'] = [new cmds.BuildCommand(),
            both(ContextValues.solution, ContextValues.project)];

        this.commands['clean'] = [new cmds.CleanCommand(),
            both(ContextValues.solution, ContextValues.project)];

        this.commands['rebuild'] = [new cmds.MsBuildRebuildCommand(),
            both(ContextValues.solution, ContextValues.project)];

        this.commands['collapseAll'] = [new cmds.CollapseAllCommand(provider),
            undefined];

        this.commands['copy'] = [new cmds.CopyCommand(),
            anyLang(ContextValues.projectFolder, ContextValues.projectFile)];
        this.commands["createDirectoryPackages"] = [
          new cmds.CreateDirectoryPackagesCommand(),
          both(ContextValues.solution),
        ];
        
        this.commands['createFile'] = [new cmds.CreateFileCommand(templateEngineCollection),
            [ContextValues.projectFile, ...anyLang(ContextValues.projectFolder), ...both(ContextValues.project)]];

        this.commands['createFileAbove'] = [new cmds.CreateFileCommand(templateEngineCollection, Direction.Above),
            [...fsharp(ContextValues.projectFile)]];

        this.commands['createFileBelow'] = [new cmds.CreateFileCommand(templateEngineCollection, Direction.Below),
            [...fsharp(ContextValues.projectFile)]];

        this.commands['createFolder'] = [new cmds.CreateFolderCommand(),
            [ContextValues.projectFile, ...anyLang(ContextValues.projectFolder), ...both(ContextValues.project)]];

        this.commands['createNewSolution'] = [new cmds.CreateNewSolutionCommand(),
            [ContextValues.noSolution]];

        this.commands['createSolutionFolder'] = [new cmds.CreateSolutionFolderCommand(),
            [ContextValues.solutionFolder, ...both(ContextValues.solution)]];

        this.commands['deleteFile'] = [new cmds.DeleteUnifiedCommand(),
            [ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['deleteFolder'] = [new cmds.DeleteUnifiedCommand(),
            anyLang(ContextValues.projectFolder)];

        this.commands['deleteSolutionFile'] = [new cmds.DeleteUnifiedCommand(),
            [ContextValues.solutionFile]];

        this.commands['duplicate'] = [new cmds.DuplicateCommand(),
            [ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['focus'] = [new cmds.FocusCommand(provider),
            undefined];

        this.commands['installTemplates'] = [new cmds.InstallWorkspaceTemplateFilesCommand(templateEngineCollection),
            both(ContextValues.solution)];

        this.commands['invalidateNugetCache'] = [new cmds.InvalidateNugetCacheCommand(),
            undefined];

        this.commands['moveFile'] = [new cmds.MoveCommand(provider),
            [ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['moveFileUp'] = [new cmds.MoveFileUpCommand(provider),
            fsharp(ContextValues.projectFile, ContextValues.projectFolder)];

        this.commands['moveFileDown'] = [new cmds.MoveFileDownCommand(provider),
            fsharp(ContextValues.projectFile, ContextValues.projectFolder)];

        this.commands['moveFolder'] = [new cmds.MoveCommand(provider),
            anyLang(ContextValues.projectFolder)];

        this.commands['moveToSolutionFolder'] = [new cmds.MoveToSolutionFolderCommand(),
            [ContextValues.solutionFolder, ...both(ContextValues.project)]];

        this.commands['openFile'] = [new cmds.OpenFileCommand(),
            [ ...both(ContextValues.solution, ContextValues.project), ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['openFileAndFocus'] = [new cmds.OpenFileAndFocusCommand(),
                [ ...both(ContextValues.solution, ContextValues.project), ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['pack'] = [new cmds.PackCommand(),
            cps(ContextValues.solution, ContextValues.project)];

        this.commands['paste'] = [new cmds.PasteCommand(provider),
            [...anyLang(ContextValues.projectFolder, ContextValues.projectFile), ...both(ContextValues.project)]];

        this.commands['publish'] = [new cmds.PublishCommand(),
            cps(ContextValues.solution, ContextValues.project)];

        this.commands['refresh'] = [new cmds.RefreshCommand(provider),
            [...anyLang(ContextValues.projectFolder), ContextValues.solutionFolder, ...both(ContextValues.project)]];

        this.commands['removePackage'] = [new cmds.DeleteUnifiedCommand(),
            cps(ContextValues.projectReferencedPackage)];

        this.commands['removeProject'] = [new cmds.DeleteUnifiedCommand(),
            both(ContextValues.project)];

        this.commands['removeProjectReference'] = [new cmds.DeleteUnifiedCommand(),
            cps(ContextValues.projectReferencedProject)];

        this.commands['removeSolutionFolder'] = [new cmds.DeleteUnifiedCommand(),
            [ContextValues.solutionFolder]];

        this.commands['renameFile'] = [new cmds.RenameCommand(),
            [ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['renameFolder'] = [new cmds.RenameCommand(),
            anyLang(ContextValues.projectFolder)];

        this.commands['renameSolutionItem'] = [new cmds.RenameSolutionItemCommand(provider, this.solutionFinder),
            [ContextValues.solutionFolder, ...both(ContextValues.solution, ContextValues.project)]];

        this.commands['restore'] = [new cmds.RestoreCommand(),
            cps(ContextValues.solution, ContextValues.project)];

        this.commands['revealFileInOS'] = [new cmds.RevealInOSCommand(),
            [ContextValues.projectFile, ...fsharp(ContextValues.projectFile)]];

        this.commands['run'] = [new cmds.RunCommand(),
            cps(ContextValues.project)];

        this.commands['showActiveFileInExplorer'] = [new cmds.SelectActiveDocumentCommand(provider),
            undefined];

        this.commands['test'] = [new cmds.TestCommand(),
            cps(ContextValues.project)];

        this.commands['updatePackagesVersion'] = [new cmds.UpdatePackagesVersionCommand(),
            cps(ContextValues.project, ContextValues.projectReferencedPackages)];

        this.commands['watchRun'] = [new cmds.WatchRunCommand(),
            cps(ContextValues.project)];

        this.commands['openSolution'] = [new cmds.OpenSolutionCommand(eventAggregator, solutionFinder),
            undefined];

        this.commands['openSelectedSolution'] = [new cmds.OpenSolutionFromDefaultExplorerCommand(eventAggregator, provider, solutionFinder),
                undefined];

        this.commands['deleteMultiple'] = [new cmds.DeleteUnifiedCommand(),
            [ContextValues.multipleSelection]];

        this.commands['selectMsvcToolchain'] = [new cmds.SelectMsvcToolchainCommand(),
            undefined];

        this.commands['runCppProject'] = [new cmds.RunCppProjectCommand(),
            [ContextValues.project + '-standard-exe']];

        this.commands['configureCppProject'] = [new cmds.ConfigureCppProjectCommand(),
            [ContextValues.project + '-standard', ContextValues.project + '-standard-exe']];

        this.commands['openOutputFolder'] = [new cmds.OpenOutputFolderCommand(),
            [ContextValues.project + '-standard', ContextValues.project + '-standard-exe']];

        this.commands['openTerminalAtProject'] = [new cmds.OpenTerminalAtProjectCommand(),
            [...both(ContextValues.project)]];

        this.commands['inlineBuild'] = [new cmds.BuildCommand(),
            [ContextValues.solution, ContextValues.project + '-standard', ContextValues.project + '-standard-exe']];

        this.commands['inlineRebuild'] = [new cmds.MsBuildRebuildCommand(),
            [ContextValues.solution, ContextValues.project + '-standard', ContextValues.project + '-standard-exe']];

        this.commands['cancelBuild'] = [new cmds.CancelBuildCommand(),
            undefined];

        this.commands['debugCppProject'] = [new cmds.DebugCppProjectCommand(),
            [ContextValues.project + '-standard-exe']];

        this.commands['stopRun'] = [new cmds.StopRunCommand(),
            undefined];

        this.commands['closeSolution'] = [new cmds.CloseSolutionCommand(provider, this.solutionFinder),
            [ContextValues.solution, ContextValues.solution + '-cps']];

        this.commands['addSolution'] = [new cmds.AddSolutionCommand(provider, this.solutionFinder),
            undefined];

        this.commands['activateSolution'] = [new cmds.ActivateSolutionCommand(provider, this.solutionFinder),
            [ContextValues.solution, ContextValues.solution + '-cps', ContextValues.solution + '-inactive', ContextValues.solution + '-cps-inactive']];

        this.commands['switchWorkspaceForSolution'] = [new cmds.SwitchWorkspaceForSolutionCommand(this.solutionFinder),
            [ContextValues.solution, ContextValues.solution + '-cps']];
    }

    public register() {
        Object.entries(this.commands).forEach(([key, [command, allowedContexts]]) => {
            this.registerCommand('solutionExplorer.' + key, command);
            if (allowedContexts) {
                vscode.commands.executeCommand('setContext', 'solutionExplorer.cmdAllowedContexts.' + key, allowedContexts);
            }
        });
    }

    private readonly buildCommandNames = new Set([
        'solutionExplorer.build',
        'solutionExplorer.inlineBuild',
        'solutionExplorer.rebuild',
        'solutionExplorer.inlineRebuild',
        'solutionExplorer.clean',
    ]);

    private readonly runCommandNames = new Set([
        'solutionExplorer.runCppProject',
        'solutionExplorer.debugCppProject',
    ]);

    private readonly structuralCommands = new Set([
        'solutionExplorer.renameSolutionItem',
        'solutionExplorer.closeSolution',
        'solutionExplorer.addSolution',
        'solutionExplorer.createFile',
        'solutionExplorer.createFileAbove',
        'solutionExplorer.createFileBelow',
        'solutionExplorer.createFolder',
        'solutionExplorer.delete',
        'solutionExplorer.move',
        'solutionExplorer.paste',
        'solutionExplorer.rename',
        'solutionExplorer.renameFolder',
        'solutionExplorer.deleteFolder',
        'solutionExplorer.addExistingProject',
        'solutionExplorer.addNewProject',
        'solutionExplorer.moveToSolutionFolder',
        'solutionExplorer.createSolutionFolder',
        'solutionExplorer.addExistingFileToSolutionFolder',
        'solutionExplorer.duplicate',
        'solutionExplorer.moveFileUp',
        'solutionExplorer.moveFileDown',
        'solutionExplorer.createDirectoryPackages',
    ]);

    private readonly inactiveAllowedCommandNames = new Set([
        'solutionExplorer.activateSolution',
        'solutionExplorer.switchWorkspaceForSolution'
    ]);

    private registerCommand(name: string, command: cmds.ActionsCommand) {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(name, async (arg) => {
                const clickedItem = arg instanceof TreeItem ? arg : undefined;
                const selectedItems = this.provider.getSelectedItems();
                const ctx = new cmds.ActionCommandContext(clickedItem, selectedItems, arg);

                const targetItems = this.collectTargetItems(clickedItem, selectedItems);
                const inactiveItem = targetItems.find(item => !this.provider.isItemInActiveSolution(item));
                if (inactiveItem && !this.inactiveAllowedCommandNames.has(name)) {
                    this.provider.notifyInactiveSolution(
                        inactiveItem.solution.fullPath,
                        t("solution.inactive.commandBlocked", name)
                    );
                    return;
                }

                if (clickedItem) {
                    const refreshFn = (item: any) => this.provider.refresh(item);
                    if (this.buildCommandNames.has(name) && !buildRunner.isBuildRunning()) {
                        buildRunner.setBuildingTarget(clickedItem, refreshFn);
                    } else if (this.runCommandNames.has(name) && !runTracker.isRunOrDebugActive()) {
                        runTracker.setRunningTarget(clickedItem, refreshFn);
                    }
                }

                const actions = await command.getActionsBase(ctx);
                if (actions.length > 0) {
                    await this.actionsRunner.run(actions, { isCancellationRequested: false  });
                    if (this.structuralCommands.has(name)) {
                        this.provider.refresh();
                    }
                }
            })
        );
    }

    private collectTargetItems(clickedItem: TreeItem | undefined, selectedItems: readonly TreeItem[] | undefined): TreeItem[] {
        if (clickedItem) {
            return [clickedItem];
        }
        return selectedItems ? [...selectedItems] : [];
    }
}
