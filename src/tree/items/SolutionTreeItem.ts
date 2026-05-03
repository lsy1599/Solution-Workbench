import * as vscode from "vscode";
import { ISubscription, EventTypes, IEvent, IFileEvent, FileEventType } from "@events";
import { Solution, SolutionFactory, SolutionType } from "@core/Solutions";
import { TreeItem, TreeItemCollapsibleState, TreeItemFactory, TreeItemContext, ContextValues } from "@tree";
import { DirectoryPackages } from "@core/DirectoryPackages";

export class SolutionTreeItem extends TreeItem {
    private subscription: ISubscription | undefined;
    private readonly baseLabel: string;

    constructor(context: TreeItemContext) {
        super(context, context.solution.name, TreeItemCollapsibleState.Expanded, ContextValues.solution, context.solution.fullPath);
        this.baseLabel = context.solution.name;
        this.allowIconTheme = false;
        this.subscription = context.eventAggregator.subscribe(EventTypes.file, evt => this.onFileEvent(evt));
        this.refreshActivationDescription();
    }

    public refreshContextValue(): void {
        const isActive = this.context.provider.isSolutionActive(this.solution.fullPath);
        if (this.containsContextValueChildren(ContextValues.project + '-cps')) {
            this.contextValue = ContextValues.solution + '-cps';
        } else {
            this.contextValue = ContextValues.solution;
        }
        if (!isActive) {
            this.contextValue += '-inactive';
        }
        this.refreshActivationDescription();
    }

    public dispose(): void {
        if (this.subscription) {
            this.subscription.dispose();
            this.subscription = undefined;
        }
        super.dispose();
    }

    protected createChildren(childContext: TreeItemContext): Promise<TreeItem[]> {
        return TreeItemFactory.createItemsFromSolution(childContext, this.solution);
    }

    private refreshActivationDescription(): void {
        const isActive = this.context.provider.isSolutionActive(this.solution.fullPath);
        const suffix = this.solution.type === SolutionType.Sln ? "" : " readonly";
        this.label = this.baseLabel;
        this.description = suffix.trim();
        this.tooltip = this.baseLabel;
        this.iconPath = isActive
            ? new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("foreground"))
            : new vscode.ThemeIcon("circle-large-outline", new vscode.ThemeColor("disabledForeground"));
    }

    private onFileEvent(event: IEvent): void {
        let fileEvent = <IFileEvent>event;
        if (fileEvent.path === this.solution.fullPath && fileEvent.fileEventType !== FileEventType.delete) {
            SolutionFactory.load(this.solution.fullPath).then(res => {
                this.context = new TreeItemContext(this.context.provider, res, this.workspaceRoot);
                this.refresh();

                DirectoryPackages.existsInPath(this.solution.folderPath).then(exists => {
                    if (exists && !DirectoryPackages.isRunning()) {
                        const directoryPackages = new DirectoryPackages(this.solution.folderPath);
                        directoryPackages.load();
                        directoryPackages.addProjects(this.solution.getAllProjects());
                    }
                })
            });
        }
    }
}
