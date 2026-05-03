import * as buildRunner from "@extensions/buildRunner";
import { Action } from "@actions";
import { ActionsCommand, ActionCommandContext } from "./ActionsCommand";

export class CancelBuildCommand extends ActionsCommand {
    constructor() {
        super('Cancel Build');
    }

    public async getActionsBase(_ctx: ActionCommandContext): Promise<Action[]> {
        buildRunner.cancelBuild();
        return [];
    }
}
