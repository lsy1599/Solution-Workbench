import * as path from "@extensions/path";
import * as dialogs from "@extensions/dialogs";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SolutionFinder } from "../SolutionFinder";
import { ContextValues, TreeItem } from "@tree";
import { Action, SlnRenameProject, RenameSolution, SlnRenameSolutionFolder } from "@actions";
import { SingleItemActionsCommand } from "@commands";
import { SolutionType } from "@core/Solutions";

export class RenameSolutionItemCommand extends SingleItemActionsCommand {
    constructor(
        private readonly provider: SolutionExplorerProvider,
        private readonly solutionFinder: SolutionFinder
    ) {
        super('Rename');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        return !!item && !!item.solution;
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item) { return []; }

        const isSolutionNode = item.contextValue === ContextValues.solution
            || item.contextValue === ContextValues.solution + '-cps';

        const defaultValue = isSolutionNode
            ? path.basename(item.solution.fullPath)
            : item.label;

        const newname = await dialogs.getText('New name', 'New name', defaultValue);
        if (!newname || newname === defaultValue) { return []; }

        if (isSolutionNode) {
            return [ new RenameSolution(item.solution.fullPath, newname, (oldPath, newPath) => {
                this.solutionFinder.renameSolution(oldPath, newPath);
            }) ];
        }

        if (item.solution.type === SolutionType.Sln && item.solutionItem && item.project) {
            return [ new SlnRenameProject(item.solution, item.project, item.label, newname) ];
        }

        if (item.solution.type === SolutionType.Sln && item.solutionItem) {
            return [ new SlnRenameSolutionFolder(item.solution, item.label, newname) ];
        }

        return [];
    }
}
