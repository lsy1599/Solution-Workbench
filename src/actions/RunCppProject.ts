import * as config from "@extensions/config";
import { CustomTerminalAction } from "./base/CustomTerminalAction";

export class RunCppProject extends CustomTerminalAction {
    constructor(private readonly exePath: string, private readonly projectPath: string) {
        const debugSettings = config.getProjectDebugSettings(projectPath);
        super({
            name: "msbuildRun",
            parameters: {
                exePath,
                commandArgs: debugSettings.commandArgs || "",
            },
            workingFolder: debugSettings.workingDirectory || RunCppProject.getWorkingPath(projectPath)
        });
    }

    public toString(): string {
        return `Run ${this.exePath}`;
    }
}
