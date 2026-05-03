import * as fs from "@extensions/fs";
import * as path from "@extensions/path";
import * as xml from "@extensions/xml";
import { execSync } from "child_process";

export interface MsvcInstallation {
    vsVersion: string;
    edition: string;
    installPath: string;
    msbuildPath: string;
    vcToolsVersions: string[];
    defaultVcToolsVersion: string;
    windowsSdkVersions: string[];
}

const VS_EDITIONS = ["Community", "Professional", "Enterprise", "BuildTools"];
const VS_VERSIONS: { [key: string]: string } = {
    "2019": "16.0",
    "2022": "17.0",
};
const VS_YEAR_TO_TOOLSET: { [year: string]: string } = {
    "2015": "v140",
    "2017": "v141",
    "2019": "v142",
    "2022": "v143",
};

const PROGRAM_FILES_X86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
const VSWHERE_PATH = path.join(PROGRAM_FILES_X86, "Microsoft Visual Studio", "Installer", "vswhere.exe");
const WINDOWS_KITS_PATH = path.join(PROGRAM_FILES_X86, "Windows Kits", "10", "Include");

export async function detectMsvcInstallations(): Promise<MsvcInstallation[]> {
    const installations: MsvcInstallation[] = [];

    const vswherePaths = await tryVsWhere();
    if (vswherePaths.length > 0) {
        for (const installPath of vswherePaths) {
            const installation = await probeInstallation(installPath);
            if (installation) {
                installations.push(installation);
            }
        }
    }

    if (installations.length === 0) {
        const manualResults = await manualScan();
        installations.push(...manualResults);
    }

    return installations;
}

let cachedMsBuildPath: string | undefined;

export async function findMsBuildPath(customPath?: string): Promise<string | undefined> {
    if (customPath && customPath.trim().length > 0) {
        if (await fs.exists(customPath)) {
            cachedMsBuildPath = customPath;
            return customPath;
        }
    }

    if (cachedMsBuildPath) {
        return cachedMsBuildPath;
    }

    const installations = await detectMsvcInstallations();
    if (installations.length > 0) {
        cachedMsBuildPath = installations[0].msbuildPath;
        return cachedMsBuildPath;
    }

    return undefined;
}

export function getCachedMsBuildPath(): string | undefined {
    return cachedMsBuildPath;
}

export async function ensureMsBuildPathCached(): Promise<void> {
    if (!cachedMsBuildPath) {
        await findMsBuildPath();
    }
    if (!cachedPlatformToolset) {
        await detectPlatformToolset();
    }
}

let cachedPlatformToolset: string | undefined;

export function getCachedPlatformToolset(): string | undefined {
    return cachedPlatformToolset;
}

async function detectPlatformToolset(): Promise<void> {
    const installations = await detectMsvcInstallations();
    if (installations.length > 0) {
        const year = installations[0].vsVersion;
        cachedPlatformToolset = VS_YEAR_TO_TOOLSET[year];
    }
}

export interface ProjectConfiguration {
    configuration: string;
    platform: string;
}

const projectConfigCache = new Map<string, ProjectConfiguration>();

export async function getProjectConfiguration(projectPath: string): Promise<ProjectConfiguration> {
    const cached = projectConfigCache.get(projectPath.toLowerCase());
    if (cached) { return cached; }

    const ext = path.extname(projectPath).toLowerCase();
    if (ext === ".sln") {
        return getConfigFromSln(projectPath);
    }

    return getConfigFromVcxproj(projectPath);
}

async function getConfigFromSln(slnPath: string): Promise<ProjectConfiguration> {
    try {
        const content = await fs.readFile(slnPath);
        const lines = content.split(/\r?\n/);
        let inConfigSection = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("GlobalSection(SolutionConfigurationPlatforms)")) {
                inConfigSection = true;
                continue;
            }
            if (inConfigSection && trimmed === "EndGlobalSection") {
                break;
            }

            if (!inConfigSection) { continue; }

            const match = /^([^|]+)\|([^=]+)\s*=/.exec(trimmed);
            if (match) {
                const cfg = match[1].trim();
                const plat = match[2].trim();
                if (cfg && plat && cfg !== "DESCRIPTION") {
                    const result: ProjectConfiguration = { configuration: cfg, platform: plat };
                    projectConfigCache.set(slnPath.toLowerCase(), result);
                    return result;
                }
            }
        }
    } catch { /* ignore */ }

    return getDefaultConfig();
}

async function getConfigFromVcxproj(projectPath: string): Promise<ProjectConfiguration> {
    try {
        const content = await fs.readFile(projectPath);
        const document = await xml.parseToJson(content);
        if (!document?.elements) { return getDefaultConfig(); }

        const project = document.elements.find((e: any) => e.name === "Project");
        if (!project?.elements) { return getDefaultConfig(); }

        for (const element of project.elements) {
            if (element.name !== "ItemGroup" || element.attributes?.Label !== "ProjectConfigurations") {
                continue;
            }
            if (!element.elements) { continue; }

            for (const pcElement of element.elements) {
                if (pcElement.name === "ProjectConfiguration" && pcElement.attributes?.Include) {
                    const parts = pcElement.attributes.Include.split("|");
                    if (parts.length === 2) {
                        const result: ProjectConfiguration = {
                            configuration: parts[0],
                            platform: parts[1],
                        };
                        projectConfigCache.set(projectPath.toLowerCase(), result);
                        return result;
                    }
                }
            }
        }
    } catch { /* ignore */ }

    return getDefaultConfig();
}

export function getProjectConfigurationSync(projectPath: string): ProjectConfiguration {
    return projectConfigCache.get(projectPath.toLowerCase()) || getDefaultConfig();
}

function getDefaultConfig(): ProjectConfiguration {
    return { configuration: "Release", platform: "Win32" };
}

export interface ProjectOutputInfo {
    outputPath: string;
    targetName: string;
    targetExt: string;
    configurationType: string;
    outDir: string;
}

export async function getProjectOutputInfo(projectPath: string): Promise<ProjectOutputInfo | undefined> {
    const ext = path.extname(projectPath).toLowerCase();
    if (ext !== ".vcxproj") { return undefined; }

    const projConfig = await getProjectConfiguration(projectPath);
    const projectDir = path.dirname(projectPath);
    const projectName = path.basename(projectPath, ext);

    let configurationType = "Application";

    try {
        const content = await fs.readFile(projectPath);
        const document = await xml.parseToJson(content);
        if (document?.elements) {
            const project = document.elements.find((e: any) => e.name === "Project");
            if (project?.elements) {
                for (const pg of project.elements) {
                    if (pg.name !== "PropertyGroup" || !pg.elements) { continue; }
                    const condition = pg.attributes?.Condition || "";
                    const matchesConfig = condition.includes(projConfig.configuration) && condition.includes(projConfig.platform);
                    const isGlobal = !condition;
                    for (const prop of pg.elements) {
                        if (prop.name === "ConfigurationType" && prop.elements?.[0]?.text) {
                            if (isGlobal || matchesConfig) {
                                configurationType = prop.elements[0].text;
                            }
                        }
                    }
                }
            }
        }
    } catch { /* ignore */ }

    const msbuildResult = await tryGetOutputFromMsBuild(projectPath, projConfig);
    if (msbuildResult) {
        const targetName = path.basename(msbuildResult, path.extname(msbuildResult));
        const targetExt = path.extname(msbuildResult);
        const outDir = path.dirname(msbuildResult);
        return { outputPath: msbuildResult, targetName, targetExt, configurationType, outDir };
    }

    return buildOutputInfoFromXml(projectPath, projectDir, projectName, projConfig, configurationType);
}

async function tryGetOutputFromMsBuild(projectPath: string, projConfig: ProjectConfiguration): Promise<string | undefined> {
    const msbuildPath = getCachedMsBuildPath();
    if (!msbuildPath) { return undefined; }

    try {
        const cmd = `chcp 65001 >nul && "${msbuildPath}" "${projectPath}" /t:GetTargetPath /p:Configuration=${projConfig.configuration} /p:Platform=${projConfig.platform} /nologo /v:q`;
        const output = execSync(cmd, {
            encoding: "utf8",
            timeout: 15000,
            cwd: path.dirname(projectPath),
            shell: "cmd.exe",
            windowsHide: true,
        });
        const lines = output.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("Microsoft") && !l.startsWith("Active"));
        const targetPath = lines.find(l => /\.(exe|dll|lib)$/i.test(l));
        if (targetPath && path.isAbsolute(targetPath)) {
            return targetPath;
        }
    } catch { /* fallback to xml parsing */ }

    return undefined;
}

async function buildOutputInfoFromXml(
    projectPath: string, projectDir: string, projectName: string,
    projConfig: ProjectConfiguration, configurationType: string
): Promise<ProjectOutputInfo> {
    let outDir = "";
    let targetName = projectName;
    let targetExt = ".exe";

    try {
        const content = await fs.readFile(projectPath);
        const document = await xml.parseToJson(content);
        if (document?.elements) {
            const project = document.elements.find((e: any) => e.name === "Project");
            if (project?.elements) {
                for (const pg of project.elements) {
                    if (pg.name !== "PropertyGroup" || !pg.elements) { continue; }
                    const condition = pg.attributes?.Condition || "";
                    const matchesConfig = condition.includes(projConfig.configuration) && condition.includes(projConfig.platform);
                    const isGlobal = !condition;
                    for (const prop of pg.elements) {
                        if (prop.name === "OutDir" && prop.elements?.[0]?.text && matchesConfig) {
                            outDir = prop.elements[0].text.replace(/\\/g, path.sep);
                        }
                        if (prop.name === "TargetName" && prop.elements?.[0]?.text) {
                            if (matchesConfig || isGlobal) { targetName = prop.elements[0].text; }
                        }
                        if (prop.name === "TargetExt" && prop.elements?.[0]?.text) {
                            if (matchesConfig || isGlobal) { targetExt = prop.elements[0].text; }
                        }
                    }
                }
            }
        }
    } catch { /* ignore */ }

    return buildOutputInfo(projectDir, outDir, targetName, targetExt, configurationType, projConfig);
}

function buildOutputInfo(
    projectDir: string, outDir: string, targetName: string,
    targetExt: string, configurationType: string, projConfig: ProjectConfiguration
): ProjectOutputInfo {
    if (configurationType === "DynamicLibrary") { targetExt = targetExt || ".dll"; }
    else if (configurationType === "StaticLibrary") { targetExt = targetExt || ".lib"; }
    else { targetExt = targetExt || ".exe"; }

    if (!outDir) {
        outDir = projConfig.configuration + path.sep;
    }

    outDir = expandMsBuildMacros(outDir, projectDir, projConfig);
    targetName = expandMsBuildMacros(targetName, projectDir, projConfig);

    const resolvedOutDir = path.isAbsolute(outDir) ? outDir : path.join(projectDir, outDir);
    const outputPath = path.join(resolvedOutDir, targetName + targetExt);

    return { outputPath, targetName, targetExt, configurationType, outDir: resolvedOutDir };
}

function expandMsBuildMacros(value: string, projectDir: string, projConfig: ProjectConfiguration): string {
    return value
        .replace(/\$\(Configuration\)/gi, projConfig.configuration)
        .replace(/\$\(Platform\)/gi, projConfig.platform)
        .replace(/\$\(ProjectDir\)/gi, projectDir + path.sep)
        .replace(/\$\(ProjectName\)/gi, path.basename(projectDir))
        .replace(/\$\(SolutionDir\)/gi, findSolutionDir(projectDir) + path.sep)
        .replace(/\$\(IntDir\)/gi, projConfig.configuration + path.sep);
}

function findSolutionDir(projectDir: string): string {
    let dir = projectDir;
    for (let i = 0; i < 10; i++) {
        try {
            const fsModule = require("fs");
            const files = fsModule.readdirSync(dir);
            if (files.some((f: string) => f.endsWith(".sln"))) {
                return dir;
            }
        } catch { /* ignore */ }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
    }
    return projectDir;
}

export async function getConfigurationType(projectPath: string): Promise<string> {
    const ext = path.extname(projectPath).toLowerCase();
    if (ext !== ".vcxproj") { return ""; }

    try {
        const content = await fs.readFile(projectPath);
        const document = await xml.parseToJson(content);
        if (!document?.elements) { return "Application"; }

        const project = document.elements.find((e: any) => e.name === "Project");
        if (!project?.elements) { return "Application"; }

        let configurationType = "Application";
        for (const pg of project.elements) {
            if (pg.name !== "PropertyGroup" || !pg.elements) { continue; }
            for (const prop of pg.elements) {
                if (prop.name === "ConfigurationType" && prop.elements?.[0]?.text) {
                    configurationType = prop.elements[0].text;
                }
            }
        }
        return configurationType;
    } catch {
        return "Application";
    }
}

export async function getWindowsSdkVersions(): Promise<string[]> {
    try {
        if (!(await fs.exists(WINDOWS_KITS_PATH))) {
            return [];
        }
        const dirs = await fs.readdir(WINDOWS_KITS_PATH);
        return dirs.filter(d => /^\d+\.\d+\.\d+\.\d+$/.test(d)).sort().reverse();
    } catch {
        return [];
    }
}

function tryVsWhere(): Promise<string[]> {
    return new Promise((resolve) => {
        try {
            const output = execSync(
                `"${VSWHERE_PATH}" -all -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -format value`,
                { encoding: "utf8", timeout: 10000 }
            );
            const paths = output.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            resolve(paths);
        } catch {
            resolve([]);
        }
    });
}

async function manualScan(): Promise<MsvcInstallation[]> {
    const results: MsvcInstallation[] = [];

    for (const vsYear of Object.keys(VS_VERSIONS)) {
        for (const edition of VS_EDITIONS) {
            const installPath = path.join(PROGRAM_FILES_X86, "Microsoft Visual Studio", vsYear, edition);
            const installation = await probeInstallation(installPath);
            if (installation) {
                results.push(installation);
            }
        }
    }

    return results;
}

async function probeInstallation(installPath: string): Promise<MsvcInstallation | undefined> {
    if (!(await fs.exists(installPath))) {
        return undefined;
    }

    const msbuildPath = await findMsBuildInInstall(installPath);
    if (!msbuildPath) {
        return undefined;
    }

    const vcToolsBase = path.join(installPath, "VC", "Tools", "MSVC");
    let vcToolsVersions: string[] = [];
    let defaultVcToolsVersion = "";

    try {
        if (await fs.exists(vcToolsBase)) {
            const dirs = await fs.readdir(vcToolsBase);
            vcToolsVersions = dirs.filter(d => /^\d+\.\d+\.\d+$/.test(d)).sort().reverse();
        }
    } catch { /* ignore */ }

    const defaultVersionFile = path.join(installPath, "VC", "Auxiliary", "Build", "Microsoft.VCToolsVersion.default.txt");
    try {
        if (await fs.exists(defaultVersionFile)) {
            const content = await fs.readFile(defaultVersionFile);
            defaultVcToolsVersion = content.trim();
        }
    } catch { /* ignore */ }

    if (!defaultVcToolsVersion && vcToolsVersions.length > 0) {
        defaultVcToolsVersion = vcToolsVersions[0];
    }

    const { vsVersion, edition } = parseInstallPath(installPath);
    const windowsSdkVersions = await getWindowsSdkVersions();

    return {
        vsVersion,
        edition,
        installPath,
        msbuildPath,
        vcToolsVersions,
        defaultVcToolsVersion,
        windowsSdkVersions,
    };
}

async function findMsBuildInInstall(installPath: string): Promise<string | undefined> {
    const candidates = [
        path.join(installPath, "MSBuild", "Current", "Bin", "MSBuild.exe"),
        path.join(installPath, "MSBuild", "Current", "Bin", "amd64", "MSBuild.exe"),
        path.join(installPath, "MSBuild", "15.0", "Bin", "MSBuild.exe"),
        path.join(installPath, "MSBuild", "15.0", "Bin", "amd64", "MSBuild.exe"),
    ];

    for (const candidate of candidates) {
        if (await fs.exists(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

function parseInstallPath(installPath: string): { vsVersion: string; edition: string } {
    const parts = installPath.replace(/\\/g, "/").split("/");
    let vsVersion = "unknown";
    let edition = "unknown";

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "Microsoft Visual Studio" && i + 2 < parts.length) {
            vsVersion = parts[i + 1];
            edition = parts[i + 2];
            break;
        }
    }

    return { vsVersion, edition };
}

export async function getProjectSourceDir(projectPath: string): Promise<string> {
    const projectDir = path.dirname(projectPath);
    const ext = path.extname(projectPath).toLowerCase();
    if (ext !== ".vcxproj") { return projectDir; }

    try {
        const content = await fs.readFile(projectPath);
        const doc = await xml.parseToJson(content);
        const project = doc.elements?.find((e: any) => e.name === "Project");
        if (!project?.elements) { return projectDir; }

        const projConfig = await getProjectConfiguration(projectPath);
        const fsModule = require("fs");

        const existingDirs: string[] = [];
        for (const group of project.elements) {
            if (group.name !== "ItemGroup" || !group.elements) { continue; }
            for (const item of group.elements) {
                if (item.name !== "ClCompile" && item.name !== "ClInclude") { continue; }
                let inc: string = item.attributes?.Include;
                if (!inc) { continue; }

                inc = expandMsBuildMacros(inc, projectDir, projConfig);
                inc = inc.replace(/\\/g, path.sep);

                const resolved = path.isAbsolute(inc)
                    ? inc
                    : path.resolve(path.join(projectDir, inc));

                if (fsModule.existsSync(resolved)) {
                    existingDirs.push(path.dirname(resolved));
                }
            }
        }

        if (existingDirs.length === 0) { return projectDir; }

        let common = existingDirs[0];
        for (let i = 1; i < existingDirs.length; i++) {
            common = getCommonPrefix(common, existingDirs[i]);
        }

        if (common && fsModule.existsSync(common)) {
            return common;
        }
        return projectDir;
    } catch {
        return projectDir;
    }
}

function getCommonPrefix(a: string, b: string): string {
    const aParts = a.replace(/\\/g, "/").split("/");
    const bParts = b.replace(/\\/g, "/").split("/");
    const common: string[] = [];
    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i].toLowerCase() === bParts[i].toLowerCase()) {
            common.push(aParts[i]);
        } else {
            break;
        }
    }
    return common.join(path.sep) || a;
}
