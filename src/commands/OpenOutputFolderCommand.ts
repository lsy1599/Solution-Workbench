import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as logger from "@extensions/logger";
import { getProjectOutputInfo, getProjectConfiguration } from "@extensions/msvcDetector";
import { Action } from "@actions";
import { ContextValues, TreeItem } from "@tree";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";

export class OpenOutputFolderCommand extends ActionsCommand {
    constructor() {
        super('Open Output Folder');
    }

    public async getActionsBase(ctx: ActionCommandContext): Promise<Action[]> {
        const item = ctx.clickedItem;
        if (!item || !item.path) { return []; }

        await getProjectConfiguration(item.path);
        const outputInfo = await getProjectOutputInfo(item.path);

        if (!outputInfo) {
            vscode.window.showWarningMessage("Cannot determine output directory for this project.");
            return [];
        }

        const outDir = outputInfo.outDir;
        if (await fs.exists(outDir)) {
            logger.info(`Open Output Folder: ${path.basename(item.path!, path.extname(item.path!))}`);
            logger.detail(`Directory: ${outDir}`);
            const uri = vscode.Uri.file(outDir);
            await vscode.env.openExternal(uri);
        } else {
            vscode.window.showWarningMessage(`Output directory does not exist: ${outDir}. Build the project first.`);
        }

        return [];
    }
}
