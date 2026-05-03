import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as dialogs from "@extensions/dialogs";
import { Action, ActionContext } from "./base/Action";


export class RenameSolution implements Action {
    constructor(
        private readonly solutionPath: string,
        private readonly solutionname: string,
        private readonly onRenamed?: (oldPath: string, newPath: string) => void
    ) {
    }

    public toString(): string {
        return `Rename solution ${this.solutionPath} to ${this.solutionname}`;
    }

    public async execute(context: ActionContext): Promise<void> {
        if (context.cancelled) {
            return;
        }

        const originalExt = path.extname(this.solutionPath);
        let newName = this.solutionname;
        if (!newName.endsWith(originalExt)) {
            newName += originalExt;
        }

        const newSolutionPath = path.join(path.dirname(this.solutionPath), newName);
        if (newSolutionPath === this.solutionPath) {
            return;
        }

        const caseChanged = this.solutionPath.toLowerCase() === newSolutionPath.toLowerCase();
        if (await fs.exists(newSolutionPath) && !caseChanged) {
            await dialogs.showError("Solution already exists");
            return;
        }

        await fs.rename(this.solutionPath, newSolutionPath);

        if (this.onRenamed) {
            this.onRenamed(this.solutionPath, newSolutionPath);
        }
    }
}
