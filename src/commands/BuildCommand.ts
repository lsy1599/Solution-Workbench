import * as path from "@extensions/path";
import { getProjectConfiguration } from "@extensions/msvcDetector";
import { ContextValues, TreeItem } from "@tree";
import { Action, DotNetBuild, MsBuildBuild } from "@actions";
import { SingleItemActionsCommand } from "@commands";

export class BuildCommand extends SingleItemActionsCommand {
    constructor() {
        super('Build');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item) { return false; }
        return item.contextValue === ContextValues.project + '-cps'
            || item.contextValue === ContextValues.solution + '-cps'
            || item.contextValue === ContextValues.solution
            || item.contextValue === ContextValues.project + '-standard'
            || item.contextValue === ContextValues.project + '-standard-exe';
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        if (this.shouldUseMsBuild(item)) {
            await getProjectConfiguration(item.path);
            return [ new MsBuildBuild(item.path, item.solution?.fullPath) ];
        }

        return [ new DotNetBuild(item.path) ];
    }

    private shouldUseMsBuild(item: TreeItem): boolean {
        const ext = path.extname(item.path || '').toLowerCase();
        if (ext === '.vcxproj') { return true; }
        if (ext === '.sln' && item.contextValue === ContextValues.solution) { return true; }
        return false;
    }
}
