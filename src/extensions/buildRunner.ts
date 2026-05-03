import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import * as logger from "@extensions/logger";
import { isRunOrDebugActive } from "@extensions/runTracker";

let activeBuildProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel | undefined;
const buildOutputPaths = new Map<string, string>();

interface BuildTargetInfo {
    item: { contextValue: string; description?: string | boolean };
    originalContextValue: string;
    originalDescription: string | boolean | undefined;
    refreshFn: (item: any) => void;
}

let buildTarget: BuildTargetInfo | undefined;

export function setBuildingTarget(item: { contextValue: string; description?: string | boolean } | undefined, refreshFn?: (item: any) => void): void {
    if (item && refreshFn) {
        buildTarget = {
            item,
            originalContextValue: item.contextValue,
            originalDescription: item.description,
            refreshFn,
        };
    } else {
        buildTarget = undefined;
    }
}

function markBuildingItem(): void {
    if (buildTarget) {
        buildTarget.item.contextValue = buildTarget.originalContextValue + '-building';
        buildTarget.item.description = '$(sync~spin) Building...';
        buildTarget.refreshFn(buildTarget.item);
    }
}

function restoreBuildingItem(): void {
    if (buildTarget) {
        buildTarget.item.contextValue = buildTarget.originalContextValue;
        buildTarget.item.description = buildTarget.originalDescription;
        buildTarget.refreshFn(buildTarget.item);
        buildTarget = undefined;
    }
}

export function getBuildOutputPath(projectName: string): string | undefined {
    return buildOutputPaths.get(projectName.toLowerCase());
}

function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("MSBuild", "log");
    }
    return outputChannel;
}

export function isBuildRunning(): boolean {
    return !!activeBuildProcess;
}

function stripQuotes(s: string): string {
    return s.replace(/^"(.*)"$/, "$1");
}

function stripEmbeddedQuotes(s: string): string {
    return s.replace(/"/g, "");
}

function splitShellArgs(input: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if (ch === ' ' && !inQuotes) {
            if (current) { result.push(current); }
            current = "";
        } else {
            current += ch;
        }
    }
    if (current) { result.push(current); }
    return result;
}

export function executeBuild(args: string[], cwd: string): void {
    if (activeBuildProcess) {
        vscode.window.showWarningMessage("A build is already in progress. Cancel it first.");
        return;
    }

    if (isRunOrDebugActive()) {
        vscode.window.showWarningMessage("Cannot build while a program is running. Stop it first.");
        return;
    }

    const channel = getOutputChannel();
    channel.clear();
    channel.show(true);

    let exePath: string;
    let exeArgs: string[];

    if (args[0]?.toLowerCase() === "cmd" && args[1]?.toLowerCase() === "/c") {
        exePath = stripQuotes(args[2]);
        exeArgs = args.slice(3).flatMap(a => splitShellArgs(a)).map(a => stripEmbeddedQuotes(a)).filter(a => a.trim().length > 0);
    } else {
        exePath = stripQuotes(args[0]);
        exeArgs = args.slice(1).flatMap(a => splitShellArgs(a)).map(a => stripEmbeddedQuotes(a)).filter(a => a.trim().length > 0);
    }

    const fullCmd = `"${exePath}" ${exeArgs.join(" ")}`;
    channel.appendLine(`> ${fullCmd}`);
    channel.appendLine(`  Working directory: ${cwd}`);
    channel.appendLine("");

    logger.separator();
    logger.command("MSBuild", fullCmd);
    logger.detail(`Working directory: ${cwd}`);

    vscode.commands.executeCommand("setContext", "solutionExplorer.buildInProgress", true);
    markBuildingItem();

    const proc = spawn(exePath, exeArgs, {
        cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });

    activeBuildProcess = proc;

    proc.stdout?.on("data", (data: Buffer) => {
        const text = decodeOutput(data);
        channel.append(text);
        parseBuildOutputPaths(text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
        channel.append(decodeOutput(data));
    });

    proc.on("close", (code: number | null) => {
        activeBuildProcess = undefined;
        vscode.commands.executeCommand("setContext", "solutionExplorer.buildInProgress", false);
        restoreBuildingItem();

        channel.appendLine("");
        if (code === 0) {
            channel.appendLine("========== Build succeeded ==========");
            logger.info("Build succeeded");
            vscode.window.showInformationMessage("Build succeeded.");
        } else if (code === null) {
            channel.appendLine("========== Build cancelled ==========");
            logger.warn("Build cancelled by user");
        } else {
            channel.appendLine(`========== Build failed (exit code: ${code}) ==========`);
            logger.error(`Build failed (exit code: ${code})`);
            vscode.window.showErrorMessage(`Build failed with exit code ${code}.`);
        }
    });

    proc.on("error", (err: Error) => {
        activeBuildProcess = undefined;
        vscode.commands.executeCommand("setContext", "solutionExplorer.buildInProgress", false);
        restoreBuildingItem();
        channel.appendLine(`\nBuild error: ${err.message}`);
        vscode.window.showErrorMessage(`Build error: ${err.message}`);
    });
}

function parseBuildOutputPaths(text: string): void {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const match = /^\s*(\S+\.vcxproj)\s+->\s+(.+\.(exe|dll|lib))\s*$/i.exec(line);
        if (match) {
            const projFile = match[1].toLowerCase();
            const outputPath = match[2].trim();
            const projBasename = projFile.replace(/^.*[/\\]/, "").replace(/\.vcxproj$/i, "");
            buildOutputPaths.set(projBasename, outputPath);
        }
    }
}

function decodeOutput(data: Buffer): string {
    try {
        const utf8 = data.toString("utf8");
        if (!utf8.includes("\ufffd")) {
            return utf8;
        }
    } catch { /* fallback */ }

    try {
        const iconv = require("iconv-lite");
        return iconv.decode(data, "cp936");
    } catch { /* fallback */ }

    return data.toString("utf8");
}

export function cancelBuild(): void {
    if (activeBuildProcess && activeBuildProcess.pid) {
        const pid = activeBuildProcess.pid;
        logger.info(`Cancelling build (PID: ${pid})`);
        try {
            spawn("taskkill", ["/pid", String(pid), "/f", "/t"], { shell: true, windowsHide: true });
        } catch { /* ignore */ }
        activeBuildProcess = undefined;
        vscode.commands.executeCommand("setContext", "solutionExplorer.buildInProgress", false);
        restoreBuildingItem();
        const channel = getOutputChannel();
        channel.appendLine("\n========== Build cancelled by user ==========");
        logger.warn("Build cancelled by user");
        vscode.window.showInformationMessage("Build cancelled.");
    }
}
