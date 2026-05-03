import * as vscode from "vscode";
import * as logger from "@extensions/logger";
import { Action } from "@actions";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";
import { detectMsvcInstallations, MsvcInstallation } from "@extensions/msvcDetector";

export class SelectMsvcToolchainCommand extends ActionsCommand {
    constructor() {
        super('Select MSVC Toolchain');
    }

    public async getActionsBase(_ctx: ActionCommandContext): Promise<Action[]> {
        await this.selectToolchain();
        return [];
    }

    private async selectToolchain(): Promise<void> {
        const installations = await detectMsvcInstallations();

        if (installations.length === 0) {
            vscode.window.showWarningMessage(
                "No Visual Studio installation with MSVC tools found. Please install Visual Studio with C++ workload or set 'vssolution.msbuildPath' manually."
            );
            return;
        }

        const installPick = await this.pickInstallation(installations);
        if (!installPick) { return; }

        const config = vscode.workspace.getConfiguration("vssolution");
        await config.update("msbuildPath", installPick.msbuildPath, vscode.ConfigurationTarget.Workspace);

        const configPick = await vscode.window.showQuickPick(
            ["Debug", "Release"],
            { placeHolder: "Select build configuration" }
        );
        if (configPick) {
            await config.update("msbuildConfiguration", configPick, vscode.ConfigurationTarget.Workspace);
        }

        const platforms = ["x64", "x86", "ARM", "ARM64", "Win32"];
        const platformPick = await vscode.window.showQuickPick(
            platforms,
            { placeHolder: "Select target platform" }
        );
        if (platformPick) {
            await config.update("msbuildPlatform", platformPick, vscode.ConfigurationTarget.Workspace);
        }

        logger.separator();
        logger.info("MSVC Toolchain configured");
        logger.detail(`VS: ${installPick.vsVersion} ${installPick.edition}`);
        logger.detail(`MSBuild: ${installPick.msbuildPath}`);
        if (configPick) { logger.detail(`Configuration: ${configPick}`); }
        if (platformPick) { logger.detail(`Platform: ${platformPick}`); }

        vscode.window.showInformationMessage(
            `MSVC Toolchain configured: ${installPick.edition} ${installPick.vsVersion}, MSBuild: ${installPick.msbuildPath}`
        );
    }

    private async pickInstallation(installations: MsvcInstallation[]): Promise<MsvcInstallation | undefined> {
        if (installations.length === 1) {
            return installations[0];
        }

        const items = installations.map(inst => ({
            label: `Visual Studio ${inst.vsVersion} ${inst.edition}`,
            description: `MSVC ${inst.defaultVcToolsVersion}`,
            detail: inst.msbuildPath,
            installation: inst,
        }));

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: "Select Visual Studio installation"
        });

        return picked?.installation;
    }
}
