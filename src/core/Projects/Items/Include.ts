import * as path from "@extensions/path";
import * as fs from "@extensions/fs";
import * as glob from "@extensions/glob";
import { ProjectItemEntry } from "./ProjectItemEntry";
import { IncludeBase } from "./IncludeBase";

export class Include extends IncludeBase {

    constructor(type: string, value: string, link?: string, linkBase?: string, public readonly exclude?: string, public readonly dependentUpon?: string) {
        super(type, value, link, linkBase);
    }

    public async getEntries(projectBasePath: string, entries: ProjectItemEntry[]): Promise<ProjectItemEntry[]> {
        for (const pattern of this.value.split(';')) {
            const isAbsolutePath = path.isAbsolute(pattern);

            let result: string[];
            let effectiveSearchPath: string;

            if (isAbsolutePath && !glob.isGlobPattern(pattern)) {
                result = [pattern];
                effectiveSearchPath = path.dirname(pattern);
            } else {
                const internalPath = this.getInternalPath(pattern);
                effectiveSearchPath = glob.isGlobPattern(pattern) ? path.join(projectBasePath, internalPath) : projectBasePath;
                result = await glob.globFileSearch(effectiveSearchPath, this.cleanPathDownAtStart(pattern), this.exclude ? this.exclude?.split(';') : undefined);
            }

            for (const filepath of result) {
                const isLink = !filepath.startsWith(projectBasePath);
                let relativePath: string;

                if (isLink && isAbsolutePath) {
                    relativePath = path.relative(projectBasePath, filepath);
                } else {
                    const recursiveDir = this.getRecursiveDir(filepath, effectiveSearchPath);
                    relativePath = this.getRelativePath(filepath, recursiveDir);
                }

                const folderEntries: ProjectItemEntry[] = this.createFoldersIfNotExists(entries, relativePath, filepath, isLink);
                if (folderEntries.length > 0) {
                    entries.push(...folderEntries);
                }
                const filename = path.basename(relativePath);
                let isDirectory: boolean;
                try {
                    isDirectory = await fs.isDirectory(filepath);
                } catch (e) {
                    isDirectory = path.extname(filepath) === "";
                }

                const exists = entries.find(e => e.relativePath === relativePath);
                if (!exists) {
                    entries.push({
                        name: filename,
                        fullPath: filepath,
                        relativePath: relativePath,
                        isDirectory: isDirectory,
                        isLink: isLink,
                        dependentUpon: this.dependentUpon
                    });
                }
            }
        }

        return entries;
    }

    private createFoldersIfNotExists( entries: ProjectItemEntry[], relativePath: string, filepath: string, isLink: boolean): ProjectItemEntry[] {
        const folderEntries: ProjectItemEntry[] = [];
        let relativeFolder = path.dirname(relativePath);
        filepath = path.dirname(filepath);
        while (relativeFolder && relativeFolder !== ".") {
            const folder = entries.find(e => e.relativePath === relativeFolder);
            if (!folder) {
                folderEntries.push({
                    name: path.basename(relativeFolder),
                    fullPath: filepath,
                    relativePath: relativeFolder,
                    isDirectory: true,
                    isLink: isLink,
                    dependentUpon: undefined
                });
            }

            relativeFolder = path.dirname(relativeFolder);
            filepath = path.dirname(filepath);
        }

        return folderEntries.reverse();
    }

    public isPathIncluded(projectBasePath: string, sourcePath: string): boolean {
        return this.testIncluded(projectBasePath, sourcePath) && !this.testExcluded(projectBasePath, sourcePath);
    }

    private testIncluded(projectBasePath: string, text: string): boolean {
        return glob.globTest(this.value.split(';').map(s => path.join(projectBasePath, s)), text);
    }

    private testExcluded(projectBasePath: string, text: string): boolean {
        return glob.globTest((this.exclude ? this.exclude.split(';') : []).map(s => path.join(projectBasePath, s)), text);
    }

    private getInternalPath(value: string): string {
        const search = (c: string) => {
            const index = value.indexOf('*');
            if (index < 0) {
                return value.length;
            }

            return index;
        }
        const index = Math.min(
                        search('*'),
                        search('?'),
                        search('['),
                        search('{'));

        return path.dirname(value.substring(0, index + 1));
    }

    private cleanPathDownAtStart(filepath: string): string {
        const folderDown = ".." + path.sep;
        while(filepath.startsWith(folderDown)) {
            filepath = filepath.substring(folderDown.length);
        }

        return filepath;
    }

}
