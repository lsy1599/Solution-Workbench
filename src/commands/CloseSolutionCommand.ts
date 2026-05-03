import { ContextValues, TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SolutionFinder } from "../SolutionFinder";

export class CloseSolutionCommand extends SingleItemActionsCommand {
    constructor(
        private readonly provider: SolutionExplorerProvider,
        private readonly solutionFinder: SolutionFinder
    ) {
        super('Close Solution');
    }

    public shouldRun(item: TreeItem | undefined): boolean {
        if (!item) { return false; }
        return item.contextValue === ContextValues.solution
            || item.contextValue === ContextValues.solution + '-cps';
    }

    public async getActions(item: TreeItem | undefined): Promise<Action[]> {
        if (!item || !item.path) { return []; }

        this.solutionFinder.removeSolution(item.path);
        this.provider.refresh();

        return [];
    }
}
