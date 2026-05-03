import * as path from "@extensions/path";
import * as config from "@extensions/config";
import { getCachedMsBuildPath, getCachedPlatformToolset, getProjectConfigurationSync } from "@extensions/msvcDetector";
import { CustomTerminalAction, CustomTerminalOptions } from "./base/CustomTerminalAction";

export class MsBuildBuild extends CustomTerminalAction {
    private readonly projectPath: string;

    constructor(projectPath: string, solutionPath?: string) {
        super(MsBuildBuild.buildOptions(projectPath, solutionPath));
        this.projectPath = projectPath;
    }

    private static buildOptions(projectPath: string, solutionPath?: string): CustomTerminalOptions {
        const projConfig = getProjectConfigurationSync(projectPath);
        const toolset = config.getMsBuildPlatformToolset() || getCachedPlatformToolset() || "";
        const ext = path.extname(projectPath).toLowerCase();
        const userArgs = config.getMsBuildAdditionalArgs().join(" ");

        const useSlnBuild = solutionPath && ext === '.vcxproj'
            && !MsBuildBuild.hasProjectReferences(projectPath);

        if (useSlnBuild) {
            const projectTarget = MsBuildBuild.getProjectTarget(projectPath, solutionPath);
            return {
                name: "msbuildBuildViaSln",
                parameters: {
                    solutionPath,
                    projectTarget,
                    msbuildPath: getCachedMsBuildPath() || config.getMsBuildPath() || "MSBuild.exe",
                    configuration: config.getMsBuildConfiguration() || projConfig.configuration,
                    platform: config.getMsBuildPlatform() || projConfig.platform,
                    toolsetArg: toolset ? `/p:PlatformToolset=${toolset}` : "",
                    verbosity: config.getMsBuildVerbosity(),
                    parallelArg: config.getMsBuildParallelBuild() ? "/m" : "",
                    additionalArgs: userArgs,
                },
                workingFolder: MsBuildBuild.getWorkingPath(solutionPath)
            };
        }

        const slnProps = (solutionPath && ext === '.vcxproj')
            ? MsBuildBuild.buildSolutionProps(solutionPath) : "";
        const additionalArgs = [userArgs, slnProps].filter(Boolean).join(" ");

        return {
            name: "msbuildBuild",
            parameters: {
                projectPath,
                msbuildPath: getCachedMsBuildPath() || config.getMsBuildPath() || "MSBuild.exe",
                configuration: config.getMsBuildConfiguration() || projConfig.configuration,
                platform: config.getMsBuildPlatform() || projConfig.platform,
                toolsetArg: toolset ? `/p:PlatformToolset=${toolset}` : "",
                verbosity: config.getMsBuildVerbosity(),
                parallelArg: config.getMsBuildParallelBuild() ? "/m" : "",
                additionalArgs,
            },
            workingFolder: MsBuildBuild.getWorkingPath(projectPath)
        };
    }

    public static buildSolutionProps(solutionPath: string): string {
        const slnDir = path.dirname(solutionPath).replace(/\\/g, "/") + "/";
        const slnPath = solutionPath.replace(/\\/g, "/");
        const slnName = path.basename(solutionPath);
        return `/p:SolutionDir="${slnDir}" /p:SolutionPath="${slnPath}" /p:SolutionFileName="${slnName}"`;
    }

    public static hasProjectReferences(projectPath: string): boolean {
        try {
            const fsModule = require("fs");
            const content: string = fsModule.readFileSync(projectPath, "utf-8");
            return content.includes("<ProjectReference");
        } catch {
            return false;
        }
    }

    public static getProjectTarget(projectPath: string, _solutionPath: string): string {
        return path.basename(projectPath, path.extname(projectPath));
    }

    public toString(): string {
        return `MSBuild Build ${this.projectPath}`;
    }
}
