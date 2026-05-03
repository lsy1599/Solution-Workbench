import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as config from "@extensions/config";
import * as logger from "@extensions/logger";
import { getProjectOutputInfo, getProjectConfiguration } from "@extensions/msvcDetector";
import { getBuildOutputPath } from "@extensions/buildRunner";
import { isRunOrDebugActive, executeRun } from "@extensions/runTracker";
import { ContextValues, TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";

export class RunCppProjectCommand extends SingleItemActionsCommand {
    constructor() {
        super('Run C++ Project');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item) { return false; }
        return item.contextValue === ContextValues.project + '-standard-exe';
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        if (isRunOrDebugActive()) {
            vscode.window.showWarningMessage("A program is already running. Stop it first.");
            return [];
        }

        const projectName = path.basename(item.path, path.extname(item.path));
        let exePath: string | undefined;

        const buildOutput = getBuildOutputPath(projectName);
        if (buildOutput && (await fs.exists(buildOutput))) {
            exePath = buildOutput;
        }

        if (!exePath) {
            await getProjectConfiguration(item.path);
            const outputInfo = await getProjectOutputInfo(item.path);

            if (!outputInfo) {
                vscode.window.showErrorMessage("Cannot determine output for this project.");
                return [];
            }

            if (outputInfo.configurationType !== "Application") {
                vscode.window.showWarningMessage(
                    `This project produces a ${outputInfo.configurationType} (${outputInfo.targetExt}), not an executable.`
                );
                return [];
            }

            if (await fs.exists(outputInfo.outputPath)) {
                exePath = outputInfo.outputPath;
            }
        }

        if (!exePath) {
            const choice = await vscode.window.showWarningMessage(
                `Executable not found. Build the project first?`,
                "Build & Run", "Cancel"
            );
            if (choice !== "Build & Run") { return []; }

            await vscode.commands.executeCommand('solutionExplorer.build', item);

            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const buildPath = getBuildOutputPath(projectName);
                if (buildPath && (await fs.exists(buildPath))) {
                    exePath = buildPath;
                    break;
                }
            }

            if (!exePath) {
                vscode.window.showErrorMessage(`Executable not found after build.`);
                return [];
            }
        }

        const debugSettings = config.getProjectDebugSettings(item.path);
        const args = debugSettings.commandArgs ? debugSettings.commandArgs.split(/\s+/).filter(Boolean) : [];
        const cwd = debugSettings.workingDirectory || path.dirname(item.path);

        executeRun(exePath, args, cwd);
        return [];
    }
}
