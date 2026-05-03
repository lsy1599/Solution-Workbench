import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as logger from "@extensions/logger";
import { Action, ActionContext } from "./base/Action";

const PROJECT_TYPE_GUIDS: { [ext: string]: string } = {
    ".csproj": "{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}",
    ".vbproj": "{F184B08F-C81C-45F6-A57F-5ABD9991F28F}",
    ".fsproj": "{F2A71F9B-5D33-465A-A702-920D77279786}",
    ".vcxproj": "{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}",
    ".njsproj": "{9092AA53-FB77-4645-B42D-1CCCA6BD08BD}",
};

function generateGuid(): string {
    return '{' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    }) + '}';
}

export class SlnAddProject implements Action {
    constructor(
        private readonly solutionPath: string,
        private readonly projectPath: string
    ) {}

    public toString(): string {
        return `Add project ${this.projectPath} to solution ${this.solutionPath}`;
    }

    public async execute(context: ActionContext): Promise<void> {
        if (context.cancelled) { return; }

        const data = await fs.readFile(this.solutionPath);
        const lines = data.split('\n');

        const solutionDir = path.dirname(this.solutionPath);
        const relativeProjectPath = path.relative(solutionDir, this.projectPath).replace(/\//g, '\\');
        const projectName = path.basename(this.projectPath, path.extname(this.projectPath));
        const projectExt = path.extname(this.projectPath).toLowerCase();
        const typeGuid = PROJECT_TYPE_GUIDS[projectExt] || "{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}";
        const projectGuid = generateGuid();

        const alreadyExists = lines.some(l => l.includes(relativeProjectPath) || l.includes(this.projectPath));
        if (alreadyExists) {
            logger.warn(`Project already exists in solution: ${projectName}`);
            return;
        }

        let insertIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === 'Global') {
                insertIndex = i;
                break;
            }
        }

        if (insertIndex < 0) {
            insertIndex = lines.length;
        }

        const projectLine = `Project("${typeGuid}") = "${projectName}", "${relativeProjectPath}", "${projectGuid}"\r`;
        const endProjectLine = `EndProject\r`;

        lines.splice(insertIndex, 0, projectLine, endProjectLine);
        await fs.writeFile(this.solutionPath, lines.join('\n'));

        logger.separator();
        logger.info(`Added project to solution`);
        logger.detail(`Project: ${projectName} (${projectExt})`);
        logger.detail(`Path: ${relativeProjectPath}`);
        logger.detail(`Solution: ${path.basename(this.solutionPath)}`);
        logger.detail(`GUID: ${projectGuid}`);
    }
}
