export type TerminalCommand = keyof typeof defaultTerminalCommands;

export const defaultTerminalCommands = {
    addExistingProjectToSolution: [ "dotnet", "sln", "\"$solutionPath\"", "add", "\"$projectPath\"" ],
    addPackageReferenceToProject: [ "dotnet", "add", "\"$projectPath\"", "package", "\"$packageId\"" ],
    addPackageReferenceToProjectWithVersion: [ "dotnet", "add", "\"$projectPath\"", "package", "\"$packageId\"", "-v", "\"$packageVersion\"" ],
    addProjectReferenceToProject: [ "dotnet", "add", "\"$projectPath\"", "reference", "\"$referencedProjectPath\"" ],
    build: [ "dotnet", "build", "\"$projectPath\"" ],
    clean: [ "dotnet", "clean", "\"$projectPath\"" ],
    createProject: [ "dotnet", "new", "\"$projectType\"", "-lang", "\"$language\"", "-n", "\"$projectName\"", "-o", "\"$folderName\"" ],
    createSolution: [ "dotnet", "new", "sln", "-n", "\"$solutionName\"" ],
    msbuildBuild: [ "cmd", "/c", "\"$msbuildPath\"", "\"$projectPath\"", "/t:Build", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "/v:$verbosity", "$parallelArg", "$additionalArgs" ],
    msbuildBuildViaSln: [ "cmd", "/c", "\"$msbuildPath\"", "\"$solutionPath\"", "/t:$projectTarget", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "/v:$verbosity", "$parallelArg", "$additionalArgs" ],
    msbuildClean: [ "cmd", "/c", "\"$msbuildPath\"", "\"$projectPath\"", "/t:Clean", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "$parallelArg", "$additionalArgs" ],
    msbuildCleanViaSln: [ "cmd", "/c", "\"$msbuildPath\"", "\"$solutionPath\"", "/t:$projectTarget:Clean", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "$parallelArg", "$additionalArgs" ],
    msbuildRebuild: [ "cmd", "/c", "\"$msbuildPath\"", "\"$projectPath\"", "/t:Rebuild", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "/v:$verbosity", "$parallelArg", "$additionalArgs" ],
    msbuildRebuildViaSln: [ "cmd", "/c", "\"$msbuildPath\"", "\"$solutionPath\"", "/t:$projectTarget:Rebuild", "/p:Configuration=$configuration", "/p:Platform=$platform", "$toolsetArg", "/v:$verbosity", "$parallelArg", "$additionalArgs" ],
    msbuildRun: [ "cmd", "/c", "\"$exePath\"", "$commandArgs" ],
    pack: [ "dotnet", "pack", "\"$projectPath\"" ],
    publish: [ "dotnet", "publish", "\"$projectPath\"" ],
    removeProjectFromSolution: [ "dotnet", "sln", "\"$solutionPath\"", "remove", "\"$projectPath\"" ],
    removePackageReferenceFromProject: [ "dotnet", "remove", "\"$projectPath\"", "package", "\"$packageId\"" ],
    removeProjectReferenceFromProject: [ "dotnet", "remove", "\"$projectPath\"", "reference", "\"$referencedProjectPath\"" ],
    restore: [ "dotnet", "restore", "\"$projectPath\"" ],
    run: [ "dotnet", "run", "--project", "\"$projectPath\"" ],
    test: [ "dotnet", "test", "\"$projectPath\"" ],
    watch: [ "dotnet", "watch", "run", "--project", "\"$projectPath\"" ]
};
