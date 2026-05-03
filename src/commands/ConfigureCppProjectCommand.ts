import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as config from "@extensions/config";
import * as logger from "@extensions/logger";
import { getProjectOutputInfo, getProjectConfiguration, ProjectConfiguration } from "@extensions/msvcDetector";
import { Action } from "@actions";
import { ContextValues, TreeItem } from "@tree";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";

export class ConfigureCppProjectCommand extends ActionsCommand {
    constructor() {
        super('Configure C++ Project');
    }

    public async getActionsBase(ctx: ActionCommandContext): Promise<Action[]> {
        const item = ctx.clickedItem;
        if (!item || !item.path) { return []; }

        const ext = path.extname(item.path).toLowerCase();
        if (ext !== '.vcxproj' && item.contextValue !== ContextValues.project + '-standard' && item.contextValue !== ContextValues.project + '-standard-exe') {
            return [];
        }

        await this.showConfigurationMenu(item.path);
        return [];
    }

    private async showConfigurationMenu(projectPath: string): Promise<void> {
        const projConfig = await getProjectConfiguration(projectPath);
        const outputInfo = await getProjectOutputInfo(projectPath);
        const debugSettings = config.getProjectDebugSettings(projectPath);
        const projectName = path.basename(projectPath, path.extname(projectPath));

        const items: vscode.QuickPickItem[] = [
            {
                label: "$(terminal) Command Arguments",
                description: debugSettings.commandArgs || "(none)",
                detail: "Set command line arguments for running the executable"
            },
            {
                label: "$(folder) Working Directory",
                description: debugSettings.workingDirectory || path.dirname(projectPath),
                detail: "Set the working directory when running the executable"
            },
            {
                label: "$(gear) Build Configuration",
                description: `${projConfig.configuration}|${projConfig.platform}`,
                detail: "Change the active build configuration and platform"
            },
            {
                label: "$(symbol-property) View Output Info",
                description: outputInfo?.outputPath || "unknown",
                detail: `Type: ${outputInfo?.configurationType || "unknown"}, Target: ${outputInfo?.targetName || projectName}${outputInfo?.targetExt || ""}`
            }
        ];

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: `Configure: ${projectName}`,
            title: `${projectName} Properties`
        });

        if (!picked) { return; }

        if (picked.label.includes("Command Arguments")) {
            await this.editCommandArgs(projectPath, debugSettings);
        } else if (picked.label.includes("Working Directory")) {
            await this.editWorkingDirectory(projectPath, debugSettings);
        } else if (picked.label.includes("Build Configuration")) {
            await this.editBuildConfiguration(projectPath, projConfig);
        } else if (picked.label.includes("View Output Info")) {
            if (outputInfo) {
                vscode.window.showInformationMessage(
                    `Output: ${outputInfo.outputPath}\nType: ${outputInfo.configurationType}\nOutDir: ${outputInfo.outDir}`
                );
            }
        }
    }

    private async editCommandArgs(projectPath: string, settings: config.ProjectDebugSettings): Promise<void> {
        const newArgs = await vscode.window.showInputBox({
            prompt: "Command Arguments",
            value: settings.commandArgs,
            placeHolder: "e.g. --input file.txt --verbose"
        });

        if (newArgs !== undefined) {
            await config.setProjectDebugSettings(projectPath, {
                ...settings,
                commandArgs: newArgs
            });
            logger.info(`Command arguments updated: "${newArgs}"`);
            logger.detail(`Project: ${path.basename(projectPath)}`);
            vscode.window.showInformationMessage(`Command arguments updated.`);
        }
    }

    private async editWorkingDirectory(projectPath: string, settings: config.ProjectDebugSettings): Promise<void> {
        const options: vscode.QuickPickItem[] = [
            { label: "$(edit) Enter path manually" },
            { label: "$(folder-opened) Browse for folder" },
            { label: "$(home) Use project directory", description: path.dirname(projectPath) },
        ];

        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: "Select working directory"
        });

        if (!choice) { return; }

        let newDir: string | undefined;

        if (choice.label.includes("Enter path")) {
            newDir = await vscode.window.showInputBox({
                prompt: "Working Directory",
                value: settings.workingDirectory || path.dirname(projectPath),
            });
        } else if (choice.label.includes("Browse")) {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(settings.workingDirectory || path.dirname(projectPath)),
                title: "Select Working Directory"
            });
            if (uris && uris.length > 0) {
                newDir = uris[0].fsPath;
            }
        } else if (choice.label.includes("project directory")) {
            newDir = "";
        }

        if (newDir !== undefined) {
            await config.setProjectDebugSettings(projectPath, {
                ...settings,
                workingDirectory: newDir
            });
            logger.info(`Working directory updated: "${newDir || "(project default)"}"`);
            logger.detail(`Project: ${path.basename(projectPath)}`);
            vscode.window.showInformationMessage(`Working directory updated.`);
        }
    }

    private async editBuildConfiguration(projectPath: string, currentConfig: ProjectConfiguration): Promise<void> {
        const vsConfig = vscode.workspace.getConfiguration("vssolution");

        const configPick = await vscode.window.showInputBox({
            prompt: "Build Configuration",
            value: currentConfig.configuration,
            placeHolder: "e.g. Debug, Release"
        });

        if (configPick !== undefined && configPick) {
            await vsConfig.update("msbuildConfiguration", configPick, vscode.ConfigurationTarget.Workspace);
        }

        const platformPick = await vscode.window.showInputBox({
            prompt: "Target Platform",
            value: currentConfig.platform,
            placeHolder: "e.g. Win32, x64, ARM, ARM64"
        });

        if (platformPick !== undefined && platformPick) {
            await vsConfig.update("msbuildPlatform", platformPick, vscode.ConfigurationTarget.Workspace);
        }

        if (configPick || platformPick) {
            const newConf = `${configPick || currentConfig.configuration}|${platformPick || currentConfig.platform}`;
            logger.info(`Build configuration updated: ${newConf}`);
            logger.detail(`Project: ${path.basename(projectPath)}`);
            vscode.window.showInformationMessage(`Build configuration updated to ${newConf}`);
        }
    }
}
