'use strict';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HistoryData } from './extension';

export class HistoryProvider implements vscode.TreeDataProvider<Element>{
	fileHistory : Element[];
	historyData : HistoryData[];

	private _onDidChangeTreeData: vscode.EventEmitter<Element | undefined> = new vscode.EventEmitter<Element | undefined>();
	onDidChangeTreeData?: vscode.Event<Element | null | undefined> | undefined = this._onDidChangeTreeData.event;

	constructor() {
		this.fileHistory = [];
		this.historyData = [];
	}
	
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}


	fetchHistory(historyData:HistoryData[]):void {
		this.fileHistory = [];
		this.historyData = historyData;


		//let data : RegExpMatchArray | null = historyData.match(/(?<=--)(\S)*/g);
		/*if(data){	
			data.forEach(element => {
				this.fileHistory.push(new Element(element, "version", vscode.TreeItemCollapsibleState.None));
			});
		}*/

		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Element): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: Element): Thenable<Element[]> {
		let deps : Element[] = [];
		if (element) {
			switch(element.collapsibleState){
				case vscode.TreeItemCollapsibleState.Collapsed:
				case vscode.TreeItemCollapsibleState.Expanded:
					deps = deps.concat(this.fileHistory);
					break;
				default:case vscode.TreeItemCollapsibleState.None:
					break;
			}
		} else {
			deps.push(new Element("Changes", " ", vscode.TreeItemCollapsibleState.Expanded));
		}
		return Promise.resolve(deps);
	}
}




export class Element extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private version: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return this.version;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'images', 'version_light.svg'),
		dark: path.join(__filename, '..', '..', 'images', 'version_dark.svg')
	};

	contextValue = 'element';

}