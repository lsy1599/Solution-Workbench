import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as logger from "@extensions/logger";
import { getProjectSourceDir } from "@extensions/msvcDetector";
import { Action } from "@actions";
import { ContextValues, TreeItem } from "@tree";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";

export class OpenTerminalAtProjectCommand extends ActionsCommand {
    constructor() {
        super('Open Terminal at Project');
    }

    public async getActionsBase(ctx: ActionCommandContext): Promise<Action[]> {
        const item = ctx.clickedItem;
        if (!item || !item.path) { return []; }

        const projectName = path.basename(item.path, path.extname(item.path));
        const ext = path.extname(item.path).toLowerCase();

        let cwd: string;
        if (ext === ".vcxproj") {
            cwd = await getProjectSourceDir(item.path);
        } else {
            cwd = path.dirname(item.path);
        }

        if (!(await fs.exists(cwd))) {
            cwd = path.dirname(item.path);
        }

        logger.info(`Open Terminal: ${projectName}`);
        logger.detail(`Directory: ${cwd}`);

        const terminal = vscode.window.createTerminal({
            name: projectName,
            cwd
        });
        terminal.show();

        return [];
    }
}
