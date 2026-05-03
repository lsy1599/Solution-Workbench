import { EventTypes, IEvent, ISubscription, IFileEvent, FileEvent } from "@events";
import { SolutionItem } from "@core/Solutions";
import { TreeItemContext, ContextValues } from "@tree";
import { ProjectTreeItem } from "@tree/items/ProjectTreeItem";
import { getConfigurationType } from "@extensions/msvcDetector";

export class StandardProjectTreeItem extends ProjectTreeItem {
    private subscription: ISubscription | undefined;

    constructor(context: TreeItemContext, solutionItem: SolutionItem) {
        super(context, solutionItem);
        this.subscription = context.eventAggregator.subscribe(EventTypes.file, evt => this.onFileEvent(evt));
    }

    public async detectExecutableType(): Promise<void> {
        if (!this.path) { return; }
        const configType = await getConfigurationType(this.path);
        if (configType === "Application") {
            this.contextValue = ContextValues.project + '-standard-exe';
            this.createId();
        }
    }

    public dispose(): void {
        if (this.subscription) {
            this.subscription.dispose();
            this.subscription = undefined;
        }

        super.dispose();
    }

    protected shouldHandleFileEvent(fileEvent: FileEvent): boolean {
        return fileEvent.path === this.project?.fullPath;
    }

    private onFileEvent(event: IEvent): void {
        let fileEvent = <IFileEvent> event;
        if (this.shouldHandleFileEvent(fileEvent) && this.project) {
            this.project.refresh().then(res => {
                this.refresh();
            });
        }
    }
}
