import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
    if (!channel) {
        channel = vscode.window.createOutputChannel("Solution Explorer", "log");
    }
    return channel;
}

function timestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString("zh-CN", { hour12: false });
}

export function info(message: string): void {
    getChannel().appendLine(`[${timestamp()}] ✔ ${message}`);
}

export function command(label: string, cmd: string): void {
    getChannel().appendLine(`[${timestamp()}] ▶ ${label}`);
    getChannel().appendLine(`  $ ${cmd}`);
}

export function detail(message: string): void {
    getChannel().appendLine(`  → ${message}`);
}

export function warn(message: string): void {
    getChannel().appendLine(`[${timestamp()}] ⚠ ${message}`);
}

export function error(message: string): void {
    getChannel().appendLine(`[${timestamp()}] ✖ ${message}`);
}

export function separator(): void {
    getChannel().appendLine("─".repeat(60));
}

export function show(): void {
    getChannel().show(true);
}
