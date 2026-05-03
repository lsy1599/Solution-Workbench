import * as vscode from "vscode";
import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as config from "@extensions/config";
import * as Utilities from "@core/Utilities";
import { EventTypes, IEvent, IEventAggregator, ISolutionSelected, ISubscription } from "@events";

export type FoundPath = { root: string, sln: string };

const STATE_KEY = 'solutionExplorer.managedSolutions';
const ACTIVE_SOLUTION_STATE_KEY = 'solutionExplorer.activeSolution';
const WORKSPACE_BINDINGS_STATE_KEY = 'solutionExplorer.solutionWorkspaceRoots';

export class SolutionFinder {

    private subscription: ISubscription | undefined;
    private managedSolutionPaths: string[] = [];
    private activeSolutionPath: string | undefined;
    private solutionWorkspaceRoots: { [slnPath: string]: string } = {};
    private isManuallyManaged = false;
    private workspaceState: vscode.Memento | undefined;
    private globalState: vscode.Memento | undefined;

    constructor(private workspaceRoots: string[], private readonly eventAggregator: IEventAggregator) {
    }

    private static normalizePath(p: string): string {
        return p.replace(/\//g, '\\').toLowerCase();
    }

    private pathIndex(slnPath: string): number {
        const norm = SolutionFinder.normalizePath(slnPath);
        return this.managedSolutionPaths.findIndex(p => SolutionFinder.normalizePath(p) === norm);
    }

    private findManagedPath(slnPath: string): string | undefined {
        const idx = this.pathIndex(slnPath);
        return idx >= 0 ? this.managedSolutionPaths[idx] : undefined;
    }

    public setWorkspaceState(state: vscode.Memento): void {
        this.workspaceState = state;
        const source = this.globalState || this.workspaceState;
        const saved = source.get<string[]>(STATE_KEY);
        if (saved && saved.length > 0) {
            this.managedSolutionPaths = saved;
            this.isManuallyManaged = true;
        }

        const active = source.get<string>(ACTIVE_SOLUTION_STATE_KEY);
        if (active && active.length > 0) {
            this.activeSolutionPath = active;
        }

        const bindings = source.get<{ [slnPath: string]: string }>(WORKSPACE_BINDINGS_STATE_KEY);
        if (bindings) {
            this.solutionWorkspaceRoots = bindings;
        }

        this.ensureActiveSolution();
    }

    public setGlobalState(state: vscode.Memento): void {
        this.globalState = state;
        this.setWorkspaceState(this.workspaceState || state);
    }

    private persistState(): void {
        if (this.workspaceState) {
            this.workspaceState.update(STATE_KEY, this.managedSolutionPaths);
            this.workspaceState.update(ACTIVE_SOLUTION_STATE_KEY, this.activeSolutionPath || "");
            this.workspaceState.update(WORKSPACE_BINDINGS_STATE_KEY, this.solutionWorkspaceRoots);
        }
        if (this.globalState) {
            this.globalState.update(STATE_KEY, this.managedSolutionPaths);
            this.globalState.update(ACTIVE_SOLUTION_STATE_KEY, this.activeSolutionPath || "");
            this.globalState.update(WORKSPACE_BINDINGS_STATE_KEY, this.solutionWorkspaceRoots);
        }
    }

	public get hasWorkspaceRoots(): boolean {
		return this.workspaceRoots.length > 0;
	}

	public register(): void {
		this.subscription = this.eventAggregator.subscribe(EventTypes.solution, evt => this.onSolutionEvent(evt));
	}

	public isWorkspaceSolutionFile(filePath: string): boolean {
		return this.workspaceRoots.indexOf(path.dirname(filePath)) >= 0
		    	&& (filePath.endsWith('.sln') || filePath.endsWith('.slnx'));
	}

    public async findSolutions(): Promise<FoundPath[]> {
		if (this.isManuallyManaged) {
			const result: FoundPath[] = [];
			const seen = new Set<string>();
			for (const slnPath of this.managedSolutionPaths) {
				const norm = SolutionFinder.normalizePath(slnPath);
				if (seen.has(norm)) { continue; }
				seen.add(norm);
				if (await fs.exists(slnPath)) {
					result.push({ root: path.dirname(slnPath), sln: slnPath });
				}
			}
            this.managedSolutionPaths = result.map(r => r.sln);
            this.ensureActiveSolution();
            this.persistState();
			return result;
		}

		let solutionPaths: FoundPath[] = [];

		if (config.getOpenSolutionsInSettings()) {
			const defaultSolution = config.getDotnetDefaultSolution();
			if (defaultSolution && defaultSolution.length > 0) {
				const defaultSolutionPath = path.join(this.workspaceRoots[0], defaultSolution);
				if (await fs.exists(defaultSolutionPath)) {
					solutionPaths.push({ root: this.workspaceRoots[0], sln: defaultSolutionPath });
				}
			}
		}

		if (config.getOpenSolutionsInRootFolder()) {
			for (let i = 0; i < this.workspaceRoots.length; i++) {
				const paths = await Utilities.searchFilesInDir(this.workspaceRoots[i], ['.sln', '.slnx']);
				paths.forEach(p => solutionPaths.push({ root: this.workspaceRoots[i], sln: p }));
			}
		}

		if (config.getOpenSolutionsInAltFolders()) {
			let altFolders = config.getAlternativeSolutionFolders();
			for (let i = 0; i < altFolders.length; i++) {
				for (let j = 0; j < this.workspaceRoots.length; j++) {
					const paths = await Utilities.searchFilesInDir(path.join(this.workspaceRoots[j], altFolders[i]), ['.sln', '.slnx']);
					paths.forEach(p => solutionPaths.push({ root: this.workspaceRoots[j], sln: p }));
				}
			}
		}

		if (config.getOpenSolutionsInFoldersAndSubfolders()) {
			for (let i = 0; i < this.workspaceRoots.length; i++) {
				const paths = await Utilities.searchFilesInDir(this.workspaceRoots[i], ['.sln', '.slnx'], true);
				paths.forEach(p => solutionPaths.push({ root: this.workspaceRoots[i], sln: p }));
			}
		}

		const result = SolutionFinder.removeDuplicates(solutionPaths);
		this.managedSolutionPaths = result.map(r => r.sln);
		this.isManuallyManaged = true;
        this.ensureActiveSolution();
		this.persistState();
		return result;
	}

	public addSolution(slnPath: string): void {
		this.isManuallyManaged = true;
		if (this.pathIndex(slnPath) < 0) {
			this.managedSolutionPaths.push(slnPath);
		}
        this.setActiveSolution(slnPath);
		this.persistState();
	}

	public removeSolution(slnPath: string): void {
		const idx = this.pathIndex(slnPath);
		if (idx >= 0) {
			this.managedSolutionPaths.splice(idx, 1);
		}
        this.deleteWorkspaceBinding(slnPath);
        if (this.isSolutionActive(slnPath)) {
            this.activeSolutionPath = undefined;
        }
        this.ensureActiveSolution();
		this.persistState();
	}

	public renameSolution(oldPath: string, newPath: string): void {
		const idx = this.pathIndex(oldPath);
		if (idx >= 0) {
			this.managedSolutionPaths[idx] = newPath;
		}
		const newIdx = this.pathIndex(newPath);
		if (newIdx < 0) {
			if (idx < 0) {
				this.managedSolutionPaths.push(newPath);
			}
		} else if (idx >= 0 && newIdx !== idx) {
			this.managedSolutionPaths.splice(newIdx, 1);
		}

        this.renameWorkspaceBinding(oldPath, newPath);
        if (this.isSolutionActive(oldPath)) {
            this.activeSolutionPath = this.findManagedPath(newPath) || newPath;
        }
        this.ensureActiveSolution();
		this.persistState();
	}

    public getActiveSolutionPath(): string | undefined {
        const current = this.activeSolutionPath;
        if (!current) { return undefined; }
        return this.findManagedPath(current);
    }

    public setActiveSolution(slnPath: string): void {
        const managedPath = this.findManagedPath(slnPath);
        if (!managedPath) { return; }
        this.activeSolutionPath = managedPath;
        this.persistState();
    }

    public isSolutionActive(slnPath: string): boolean {
        const active = this.getActiveSolutionPath();
        if (!active) { return false; }
        return SolutionFinder.normalizePath(active) === SolutionFinder.normalizePath(slnPath);
    }

    public ensureActiveSolution(): string | undefined {
        if (this.managedSolutionPaths.length <= 0) {
            this.activeSolutionPath = undefined;
            return undefined;
        }

        const current = this.getActiveSolutionPath();
        if (current) {
            return current;
        }

        this.activeSolutionPath = this.managedSolutionPaths[0];
        return this.activeSolutionPath;
    }

    public bindWorkspaceRoot(slnPath: string, workspaceRoot: string): void {
        const managedPath = this.findManagedPath(slnPath) || slnPath;
        this.solutionWorkspaceRoots[managedPath] = workspaceRoot;
        this.persistState();
    }

    public getBoundWorkspaceRoot(slnPath: string): string | undefined {
        const managedPath = this.findManagedPath(slnPath) || slnPath;
        return this.solutionWorkspaceRoots[managedPath];
    }

    private deleteWorkspaceBinding(slnPath: string): void {
        const keys = Object.keys(this.solutionWorkspaceRoots);
        const normalized = SolutionFinder.normalizePath(slnPath);
        for (const key of keys) {
            if (SolutionFinder.normalizePath(key) === normalized) {
                delete this.solutionWorkspaceRoots[key];
            }
        }
    }

    private renameWorkspaceBinding(oldPath: string, newPath: string): void {
        const oldKey = Object.keys(this.solutionWorkspaceRoots)
            .find(k => SolutionFinder.normalizePath(k) === SolutionFinder.normalizePath(oldPath));
        if (!oldKey) { return; }
        const root = this.solutionWorkspaceRoots[oldKey];
        delete this.solutionWorkspaceRoots[oldKey];
        this.solutionWorkspaceRoots[newPath] = root;
    }

    public unregister() {
        if (this.subscription) {
            this.subscription.dispose();
            this.subscription = undefined;
        }
    }

    private onSolutionEvent(event: IEvent): void {
		let solutionEvent = <ISolutionSelected> event;
		this.addSolution(solutionEvent.slnPath);
	}

	private static removeDuplicates(array: FoundPath[]): FoundPath[] {
		let result: FoundPath[] = [];
		for (let i = 0; i < array.length; i++) {
			if (result.findIndex(x => x.sln === array[i].sln) === -1) {
				result.push(array[i]);
			}
		}

		return result;
	}
}
