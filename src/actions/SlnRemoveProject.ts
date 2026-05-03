import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import { Action, ActionContext } from "./base/Action";

export class SlnRemoveProject implements Action {
    constructor(
        private readonly solutionPath: string,
        private readonly projectFullPath: string
    ) {}

    public toString(): string {
        return `Remove project ${this.projectFullPath} from solution ${this.solutionPath}`;
    }

    public async execute(context: ActionContext): Promise<void> {
        if (context.cancelled) { return; }

        const data = await fs.readFile(this.solutionPath);
        const lines = data.split('\n');

        const solutionDir = path.dirname(this.solutionPath);
        const relativeProjectPath = path.relative(solutionDir, this.projectFullPath).replace(/\//g, '\\');

        let projectGuid = "";
        let projectLineStart = -1;
        let projectLineEnd = -1;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            if (projectLineStart < 0 && trimmed.startsWith('Project(') &&
                (trimmed.includes(relativeProjectPath) || trimmed.includes(this.projectFullPath))) {
                projectLineStart = i;
                const guidMatch = /,\s*"(\{[^}]+\})"/.exec(trimmed);
                if (guidMatch) { projectGuid = guidMatch[1]; }
            }

            if (projectLineStart >= 0 && projectLineEnd < 0 && trimmed === 'EndProject') {
                projectLineEnd = i;
                break;
            }
        }

        if (projectLineStart >= 0 && projectLineEnd >= 0) {
            lines.splice(projectLineStart, projectLineEnd - projectLineStart + 1);
        }

        if (projectGuid) {
            let index: number;
            do {
                index = lines.findIndex(l => l.includes(projectGuid));
                if (index >= 0) {
                    lines.splice(index, 1);
                }
            } while (index >= 0);
        }

        await fs.writeFile(this.solutionPath, lines.join('\n'));
    }
}
