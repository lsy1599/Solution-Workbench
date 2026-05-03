import * as dialogs from "@extensions/dialogs";
import { TreeItem } from "@tree";
import { Action } from "@actions";
import { SingleItemActionsCommand } from "@commands";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SolutionFinder } from "../SolutionFinder";

export class AddSolutionCommand extends SingleItemActionsCommand {
    constructor(
        private readonly provider: SolutionExplorerProvider,
        private readonly solutionFinder: SolutionFinder
    ) {
        super('Add Solution');
    }

    public shouldRun(_item: TreeItem | undefined): boolean {
        return true;
    }

    public async getActions(_item: TreeItem | undefined): Promise<Action[]> {
        const solutionPath = await dialogs.openSolutionFile('Add solution');
        if (!solutionPath) { return []; }

        this.solutionFinder.addSolution(solutionPath);
        this.provider.refresh();

        return [];
    }
}
