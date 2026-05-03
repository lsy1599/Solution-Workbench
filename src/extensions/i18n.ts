import * as vscode from "vscode";

type MessageKey =
    | "solution.inactive.clickHint"
    | "solution.inactive.cannotExpand"
    | "solution.inactive.commandBlocked"
    | "solution.active.current"
    | "solution.active.none"
    | "solution.activate.success"
    | "sourceDirectory.pick.title"
    | "sourceDirectory.pick.openLabel"
    | "sourceDirectory.switching";

type Dict = Record<MessageKey, string>;

const en: Dict = {
    "solution.inactive.clickHint": "This solution is inactive. Right-click it and choose Activate Solution.",
    "solution.inactive.cannotExpand": "Inactive solutions cannot be expanded or viewed. Activate this solution first.",
    "solution.inactive.commandBlocked": "Inactive solution blocked command: {0}",
    "solution.active.current": "Current active solution: {0}",
    "solution.active.none": "No solution is currently active.",
    "solution.activate.success": "Activated solution: {0}",
    "sourceDirectory.pick.title": "Set source directory (reselect anytime)",
    "sourceDirectory.pick.openLabel": "Save & Switch",
    "sourceDirectory.switching": "Switching VSCode workspace to source directory: {0}"
};

const zhCN: Dict = {
    "solution.inactive.clickHint": "该解决方案未激活，请右击并选择 Activate Solution。",
    "solution.inactive.cannotExpand": "未激活的解决方案无法展开或查看，请先激活。",
    "solution.inactive.commandBlocked": "未激活解决方案禁止执行命令: {0}",
    "solution.active.current": "当前激活解决方案: {0}",
    "solution.active.none": "当前没有激活的解决方案。",
    "solution.activate.success": "已激活解决方案: {0}",
    "sourceDirectory.pick.title": "设置源码目录（可随时重新选择）",
    "sourceDirectory.pick.openLabel": "保存并切换",
    "sourceDirectory.switching": "正在切换 VSCode 工作区到源码目录: {0}"
};

const dictionaries: Record<string, Dict> = {
    "en": en,
    "en-us": en,
    "en-gb": en,
    "zh-cn": zhCN,
    "zh-hans": zhCN
};

function format(template: string, args: string[]): string {
    return template.replace(/\{(\d+)\}/g, (_m, index) => {
        const i = Number(index);
        return Number.isNaN(i) ? "" : (args[i] ?? "");
    });
}

function getLanguageCode(): string {
    return (vscode.env.language || "en").toLowerCase();
}

function getDictionary(): Dict {
    const lang = getLanguageCode();
    return dictionaries[lang] || dictionaries[lang.split("-")[0]] || en;
}

export function t(key: MessageKey, ...args: string[]): string {
    const dict = getDictionary();
    const template = dict[key] || en[key] || key;
    return format(template, args);
}

