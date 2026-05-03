import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as config from "@extensions/config";
import * as logger from "@extensions/logger";
import { getProjectOutputInfo, getProjectConfiguration } from "@extensions/msvcDetector";
import { getBuildOutputPath } from "@extensions/buildRunner";
import { isRunOrDebugActive } from "@extensions/runTracker";
import { ContextValues, TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";

const CPPTOOLS_EXTENSION_ID = "ms-vscode.cpptools";

export class DebugCppProjectCommand extends SingleItemActionsCommand {
    constructor() {
        super('Debug C++ Project');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item) { return false; }
        return item.contextValue === ContextValues.project + '-standard-exe';
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        if (isRunOrDebugActive()) {
            vscode.window.showWarningMessage("A program or debug session is already running. Stop it first.");
            return [];
        }

        const cpptoolsExt = vscode.extensions.getExtension(CPPTOOLS_EXTENSION_ID);
        if (!cpptoolsExt) {
            const action = await vscode.window.showErrorMessage(
                "C/C++ extension (ms-vscode.cpptools) is required for debugging. Install it now?",
                "Install", "Cancel"
            );
            if (action === "Install") {
                await vscode.commands.executeCommand(
                    "workbench.extensions.installExtension",
                    CPPTOOLS_EXTENSION_ID
                );
            }
            return [];
        }

        const exePath = await this.resolveExePath(item);
        if (!exePath) { return []; }

        const projectDir = path.dirname(item.path);
        const debugSettings = config.getProjectDebugSettings(item.path);

        const debugConfig: vscode.DebugConfiguration = {
            name: `Debug ${path.basename(exePath)}`,
            type: "cppvsdbg",
            request: "launch",
            program: exePath,
            args: debugSettings.commandArgs ? debugSettings.commandArgs.split(/\s+/).filter(Boolean) : [],
            cwd: debugSettings.workingDirectory || projectDir,
            stopAtEntry: false,
            console: "integratedTerminal",
        };

        logger.separator();
        logger.command("Debug", exePath);
        logger.detail(`Project: ${path.basename(item.path)}`);
        logger.detail(`Program: ${debugConfig.program}`);
        logger.detail(`Args: ${debugConfig.args.length > 0 ? debugConfig.args.join(" ") : "(none)"}`);
        logger.detail(`CWD: ${debugConfig.cwd}`);
        logger.detail(`Debugger: cppvsdbg (ms-vscode.cpptools)`);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const started = await vscode.debug.startDebugging(workspaceFolder, debugConfig);

        if (!started) {
            logger.error("Failed to start debugging session");
            vscode.window.showErrorMessage("Failed to start debugging session.");
        } else {
            logger.info("Debug session started");
        }

        return [];
    }

    private async resolveExePath(item: TreeItem): Promise<string | undefined> {
        const itemPath = item.path!;
        const projectName = path.basename(itemPath, path.extname(itemPath));

        const buildOutput = getBuildOutputPath(projectName);
        if (buildOutput && (await fs.exists(buildOutput))) {
            return buildOutput;
        }

        await getProjectConfiguration(itemPath);
        const outputInfo = await getProjectOutputInfo(itemPath);
        if (outputInfo) {
            if (outputInfo.configurationType !== "Application") {
                vscode.window.showWarningMessage(
                    `This project produces a ${outputInfo.configurationType} (${outputInfo.targetExt}), not a debuggable executable.`
                );
                return undefined;
            }
            if (await fs.exists(outputInfo.outputPath)) {
                return outputInfo.outputPath;
            }
        }

        const choice = await vscode.window.showWarningMessage(
            "Executable not found. Build the project first?",
            "Build & Debug", "Cancel"
        );
        if (choice !== "Build & Debug") { return undefined; }

        await vscode.commands.executeCommand('solutionExplorer.build', item);

        for (let i = 0; i < 60; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const buildPath = getBuildOutputPath(projectName);
            if (buildPath && (await fs.exists(buildPath))) {
                return buildPath;
            }
        }

        vscode.window.showErrorMessage("Executable not found after build. Check build output for errors.");
        return undefined;
    }
}
