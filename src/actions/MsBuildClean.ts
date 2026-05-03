import * as path from "@extensions/path";
import * as config from "@extensions/config";
import { getCachedMsBuildPath, getCachedPlatformToolset, getProjectConfigurationSync } from "@extensions/msvcDetector";
import { CustomTerminalAction, CustomTerminalOptions } from "./base/CustomTerminalAction";
import { MsBuildBuild } from "./MsBuildBuild";

export class MsBuildClean extends CustomTerminalAction {
    private readonly projectPath: string;

    constructor(projectPath: string, solutionPath?: string) {
        super(MsBuildClean.buildOptions(projectPath, solutionPath));
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
                name: "msbuildCleanViaSln",
                parameters: {
                    solutionPath,
                    projectTarget,
                    msbuildPath: getCachedMsBuildPath() || config.getMsBuildPath() || "MSBuild.exe",
                    configuration: config.getMsBuildConfiguration() || projConfig.configuration,
                    platform: config.getMsBuildPlatform() || projConfig.platform,
                    toolsetArg: toolset ? `/p:PlatformToolset=${toolset}` : "",
                    parallelArg: config.getMsBuildParallelBuild() ? "/m" : "",
                    additionalArgs: userArgs,
                },
                workingFolder: MsBuildClean.getWorkingPath(solutionPath)
            };
        }

        const slnProps = (solutionPath && ext === '.vcxproj')
            ? MsBuildBuild.buildSolutionProps(solutionPath) : "";
        const additionalArgs = [userArgs, slnProps].filter(Boolean).join(" ");

        return {
            name: "msbuildClean",
            parameters: {
                projectPath,
                msbuildPath: getCachedMsBuildPath() || config.getMsBuildPath() || "MSBuild.exe",
                configuration: config.getMsBuildConfiguration() || projConfig.configuration,
                platform: config.getMsBuildPlatform() || projConfig.platform,
                toolsetArg: toolset ? `/p:PlatformToolset=${toolset}` : "",
                parallelArg: config.getMsBuildParallelBuild() ? "/m" : "",
                additionalArgs,
            },
            workingFolder: MsBuildClean.getWorkingPath(projectPath)
        };
    }

    public toString(): string {
        return `MSBuild Clean ${this.projectPath}`;
    }
}
