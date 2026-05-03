import * as path from "@extensions/path";
import { getProjectConfiguration } from "@extensions/msvcDetector";
import { ContextValues, TreeItem } from "@tree";
import { Action, MsBuildRebuild } from "@actions";
import { SingleItemActionsCommand } from "@commands";

export class MsBuildRebuildCommand extends SingleItemActionsCommand {
    constructor() {
        super('Rebuild');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item) { return false; }
        return this.shouldUseMsBuild(item);
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }
        await getProjectConfiguration(item.path);
        return [ new MsBuildRebuild(item.path, item.solution?.fullPath) ];
    }

    private shouldUseMsBuild(item: TreeItem): boolean {
        const ext = path.extname(item.path || '').toLowerCase();
        if (ext === '.vcxproj') { return true; }
        if (ext === '.sln' && item.contextValue === ContextValues.solution) { return true; }
        if (item.contextValue === ContextValues.project + '-standard') { return true; }
        if (item.contextValue === ContextValues.project + '-standard-exe') { return true; }
        return false;
    }
}
