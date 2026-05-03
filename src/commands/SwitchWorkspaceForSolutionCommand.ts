import * as vscode from "vscode";
import * as logger from "@extensions/logger";
import * as fs from "@extensions/fs";
import { t } from "@extensions/i18n";
import { ContextValues, TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";
import { SolutionFinder } from "../SolutionFinder";

export class SwitchWorkspaceForSolutionCommand extends SingleItemActionsCommand {
    constructor(private readonly solutionFinder: SolutionFinder) {
        super("Set Source Directory");
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item || !item.path) { return false; }
        return item.contextValue === ContextValues.solution || item.contextValue === ContextValues.solution + "-cps";
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        const previousRoot = this.solutionFinder.getBoundWorkspaceRoot(item.path);
        const defaultUri = previousRoot && await fs.exists(previousRoot)
            ? vscode.Uri.file(previousRoot)
            : undefined;
        const selected = await vscode.window.showOpenDialog({
            title: t("sourceDirectory.pick.title"),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: t("sourceDirectory.pick.openLabel"),
            defaultUri
        });
        if (!selected || selected.length <= 0) {
            return [];
        }
        const targetRoot = selected[0].fsPath;
        this.solutionFinder.bindWorkspaceRoot(item.path, targetRoot);

        this.solutionFinder.setActiveSolution(item.path);

        const message = t("sourceDirectory.switching", targetRoot);
        logger.info(message);
        logger.detail(`Solution: ${item.path}`);
        vscode.window.showInformationMessage(message);

        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(targetRoot), false);
        return [];
    }
}

