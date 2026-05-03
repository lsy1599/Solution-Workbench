import { IEventAggregator } from "@events";
import { Action, Focus, OpenSolution } from "@actions";
import { SolutionExplorerProvider } from "@SolutionExplorerProvider";
import { SingleItemActionsFromDefaultExplorerCommand } from "./SingleItemActionsFromDefaultExplorerCommand";
import { SolutionFinder } from "../SolutionFinder";


export class OpenSolutionFromDefaultExplorerCommand extends SingleItemActionsFromDefaultExplorerCommand {
    constructor(
        private readonly eventAggregator: IEventAggregator,
        private readonly provider: SolutionExplorerProvider,
        private readonly solutionFinder: SolutionFinder
    ) {
        super('Open Solution');
    }

    public shouldRun(item: string): boolean {
        return item.toLocaleLowerCase().endsWith('.sln');
    }

    public async getActions(item: string): Promise<Action[]> {
        return [
            new OpenSolution(item, this.eventAggregator, this.solutionFinder),
            new Focus(this.provider)
        ];
    }
}
