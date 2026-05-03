import { IEventAggregator, SolutionSelected } from "@events";
import * as logger from "@extensions/logger";
import { SolutionFinder } from "../SolutionFinder";
import { Action, ActionContext } from "./base/Action";

export class OpenSolution implements Action {
    constructor(
        private readonly solutionPath: string,
        public readonly eventAggregator: IEventAggregator,
        private readonly solutionFinder: SolutionFinder
    ) {
    }

    public async execute(context: ActionContext): Promise<void> {
        if (context.cancelled) { return Promise.resolve(); }
        if (!this.solutionPath) { return Promise.resolve(); }

        this.solutionFinder.addSolution(this.solutionPath);

        const e = new SolutionSelected(this.solutionPath);
        this.eventAggregator.publish(e);
        logger.info(`Activated solution: ${this.solutionPath}`);
        logger.detail("Workspace root is unchanged. Use 'Switch VSCode Workspace Root' on the solution to switch root.");
    }

    public toString(): string {
        return `Open solution: ${this.solutionPath}`;
    }

}
