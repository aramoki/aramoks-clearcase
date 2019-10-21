'use strict';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export interface HistoryData {
	data: HistoryData[];
	version: string;
	username: string;
	operation: string;
	type: string;
	time: string;
	icon: string;
	comment?: string;
}

enum TreeItemType {
	Root,
	View,
	Element
}

export class HistoryProvider implements vscode.TreeDataProvider<Element>{
	historyData: HistoryData[];

	private _onDidChangeTreeData: vscode.EventEmitter<Element | undefined> = new vscode.EventEmitter<Element | undefined>();
	onDidChangeTreeData?: vscode.Event<Element | null | undefined> | undefined = this._onDidChangeTreeData.event;

	constructor() {
		this.historyData = [];
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	fetchHistory(historyData: HistoryData[]): void {
		this.historyData = historyData;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Element): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: Element): Thenable<Element[]> {
		let deps: Element[] = [];
		if (element) {
			switch (element.collapsibleState) {
				case vscode.TreeItemCollapsibleState.Collapsed:
				case vscode.TreeItemCollapsibleState.Expanded:
					element.historyData.forEach(history => {
						if (history.data.length > 0) {
							deps.push(new Element(
								/*
								history.icon + ' ' + history.operation + " " + history.type + ' \u2022 ' + history.username + ' ' +
								history.time +
								((history.comment) ? '  \u2261' + history.comment : ' ')
								*/
								history.version,
								' ',
								TreeItemType.View, history.data, vscode.TreeItemCollapsibleState.Expanded));
						} else {
							deps.push(new Element(
								history.version,
								history.icon + ' ' + history.operation + " " + history.type + ' \u2022 ' + history.username + ' ' +
								history.time +
								((history.comment) ? '  \u2261' + history.comment : ' '),
								(history.type === 'branch') ? TreeItemType.View : TreeItemType.Element, history.data, vscode.TreeItemCollapsibleState.None));
						}
					});
					break;
				default: case vscode.TreeItemCollapsibleState.None:
					break;
			}
		} else {
			if (this.historyData.length > 0) {
				deps.push(new Element("Changes", ' ', TreeItemType.Root, this.historyData, vscode.TreeItemCollapsibleState.Expanded));
			} else {
				deps.push(new Element("Changes", ' Click \u2193 to fetch history of current file', TreeItemType.Root, this.historyData, vscode.TreeItemCollapsibleState.None));
			}
		}
		return Promise.resolve(deps);
	}
}


export class Element extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		private version: string,
		private treeItemType: TreeItemType,
		public readonly historyData: HistoryData[],
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		switch (treeItemType) {
			case TreeItemType.Root:
				this.iconPath = {
					light: path.join(__filename, '..', '..', 'images', 'light', 'icon-repo.svg'),
					dark: path.join(__filename, '..', '..', 'images', 'dark', 'icon-repo.svg')
				};
				this.contextValue = 'element.root';
				break;
			case TreeItemType.View:
				this.iconPath = {
					light: path.join(__filename, '..', '..', 'images', 'light', 'icon-tag.svg'),
					dark: path.join(__filename, '..', '..', 'images', 'dark', 'icon-tag.svg')
				};
				this.contextValue = 'element.view';
				break;
			case TreeItemType.Element:
				this.iconPath = {
					light: path.join(__filename, '..', '..', 'images', 'light', 'icon-element.svg'),
					dark: path.join(__filename, '..', '..', 'images', 'dark', 'icon-element.svg')
				};
				this.contextValue = 'element.element';
				break;
			default:
				this.iconPath = {
					light: path.join(__filename, '..', '..', 'images', 'light', 'icon-repo.svg'),
					dark: path.join(__filename, '..', '..', 'images', 'dark', 'icon-repo.svg')
				};
				this.contextValue = 'element.none';
				break;
		}
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return this.version;
	}
}