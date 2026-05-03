import * as vscode from "vscode";
import * as fs from "@extensions/fs";
import * as logger from "@extensions/logger";
import { t } from "@extensions/i18n";
import { ContextValues, TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SolutionFinder } from "../SolutionFinder";

export class ActivateSolutionCommand extends SingleItemActionsCommand {
    constructor(
        private readonly provider: SolutionExplorerProvider,
        private readonly solutionFinder: SolutionFinder
    ) {
        super("Activate Solution");
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item || !item.path) { return false; }
        return item.contextValue === ContextValues.solution
            || item.contextValue === ContextValues.solution + "-cps"
            || item.contextValue === ContextValues.solution + "-inactive"
            || item.contextValue === ContextValues.solution + "-cps-inactive";
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        this.solutionFinder.setActiveSolution(item.path);
        this.provider.refresh();

        const name = item.label?.toString() || item.path;
        const message = t("solution.activate.success", name);
        logger.info(message);
        vscode.window.showInformationMessage(message);

        const boundRoot = this.solutionFinder.getBoundWorkspaceRoot(item.path);
        if (boundRoot && await fs.exists(boundRoot)) {
            const currentFolders = vscode.workspace.workspaceFolders;
            const currentRoot = currentFolders?.[0]?.uri.fsPath;
            if (currentRoot && currentRoot.toLowerCase() !== boundRoot.toLowerCase()) {
                const switchMsg = t("sourceDirectory.switching", boundRoot);
                logger.info(switchMsg);
                logger.detail(`Solution: ${item.path}`);
                await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(boundRoot), false);
            }
        }

        return [];
    }
}

