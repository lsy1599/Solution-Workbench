import { Action } from "@actions";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";
import { stopAll } from "@extensions/runTracker";

export class StopRunCommand extends ActionsCommand {
    constructor() {
        super('Stop Run/Debug');
    }

    public async getActionsBase(_ctx: ActionCommandContext): Promise<Action[]> {
        stopAll();
        return [];
    }
}
