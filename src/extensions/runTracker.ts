import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import * as logger from "@extensions/logger";

let activeRunProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let debugSessionActive = false;

interface RunTargetInfo {
    item: { contextValue: string; description?: string | boolean };
    originalContextValue: string;
    originalDescription: string | boolean | undefined;
    refreshFn: (item: any) => void;
}

let runTarget: RunTargetInfo | undefined;

export function setRunningTarget(item: { contextValue: string; description?: string | boolean } | undefined, refreshFn?: (item: any) => void): void {
    if (item && refreshFn) {
        runTarget = {
            item,
            originalContextValue: item.contextValue,
            originalDescription: item.description,
            refreshFn,
        };
    } else {
        runTarget = undefined;
    }
}

function markRunningItem(): void {
    if (runTarget) {
        runTarget.item.contextValue = runTarget.originalContextValue + '-running';
        runTarget.item.description = '$(play) Running...';
        runTarget.refreshFn(runTarget.item);
    }
}

function restoreRunningItem(): void {
    if (runTarget) {
        runTarget.item.contextValue = runTarget.originalContextValue;
        runTarget.item.description = runTarget.originalDescription;
        runTarget.refreshFn(runTarget.item);
        runTarget = undefined;
    }
}

function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("Run Output", "log");
    }
    return outputChannel;
}

export function isRunOrDebugActive(): boolean {
    return !!activeRunProcess || debugSessionActive;
}

function updateContext(): void {
    vscode.commands.executeCommand(
        "setContext",
        "solutionExplorer.runOrDebugInProgress",
        isRunOrDebugActive()
    );
}

export function executeRun(exePath: string, args: string[], cwd: string): void {
    if (activeRunProcess) {
        vscode.window.showWarningMessage("A program is already running. Stop it first.");
        return;
    }

    const channel = getOutputChannel();
    channel.clear();
    channel.show(true);

    const displayArgs = args.length > 0 ? " " + args.join(" ") : "";
    channel.appendLine(`> "${exePath}"${displayArgs}`);
    channel.appendLine(`  Working directory: ${cwd}`);
    channel.appendLine("");

    logger.separator();
    logger.command("Run", `"${exePath}"${displayArgs}`);
    logger.detail(`CWD: ${cwd}`);

    const proc = spawn(exePath, args, {
        cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: false,
    });

    activeRunProcess = proc;
    updateContext();
    markRunningItem();

    proc.stdout?.on("data", (data: Buffer) => {
        channel.append(data.toString("utf8"));
    });

    proc.stderr?.on("data", (data: Buffer) => {
        channel.append(data.toString("utf8"));
    });

    proc.on("close", (code: number | null) => {
        activeRunProcess = undefined;
        updateContext();
        restoreRunningItem();

        channel.appendLine("");
        if (code === 0 || code === null) {
            channel.appendLine(`========== Program exited (code: ${code ?? 0}) ==========`);
            logger.info(`Program exited (code: ${code ?? 0})`);
        } else {
            channel.appendLine(`========== Program exited with error (code: ${code}) ==========`);
            logger.warn(`Program exited with error (code: ${code})`);
        }
    });

    proc.on("error", (err: Error) => {
        activeRunProcess = undefined;
        updateContext();
        restoreRunningItem();
        channel.appendLine(`\nRun error: ${err.message}`);
        logger.error(`Run error: ${err.message}`);
        vscode.window.showErrorMessage(`Run error: ${err.message}`);
    });
}

export function stopRun(): void {
    if (activeRunProcess && activeRunProcess.pid) {
        const pid = activeRunProcess.pid;
        logger.info(`Stopping program (PID: ${pid})`);
        try {
            spawn("taskkill", ["/pid", String(pid), "/f", "/t"], { shell: true, windowsHide: true });
        } catch { /* ignore */ }
        activeRunProcess = undefined;
        updateContext();
        restoreRunningItem();
        const channel = getOutputChannel();
        channel.appendLine("\n========== Program stopped by user ==========");
        logger.warn("Program stopped by user");
    }
}

export function onDebugSessionStart(): void {
    debugSessionActive = true;
    updateContext();
    markRunningItem();
    logger.info("Debug session started");
}

export function onDebugSessionEnd(): void {
    debugSessionActive = false;
    updateContext();
    restoreRunningItem();
    logger.info("Debug session ended");
}

export function stopDebug(): void {
    if (debugSessionActive) {
        logger.info("Stopping debug session");
        vscode.debug.stopDebugging();
    }
}

export function stopAll(): void {
    if (activeRunProcess) {
        stopRun();
    }
    if (debugSessionActive) {
        stopDebug();
    }
}

export function registerDebugListeners(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(() => {
            onDebugSessionStart();
        }),
        vscode.debug.onDidTerminateDebugSession(() => {
            onDebugSessionEnd();
        })
    );
}
