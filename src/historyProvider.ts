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
					element.historyData.forEach(history => {
						if(history.data.length > 0){
							deps.push(new Element(history.title , history.sub , 'icon-tag' , history.data , vscode.TreeItemCollapsibleState.Collapsed));
						}else{
							deps.push(new Element(history.title , history.sub , 'icon-branch' , history.data , vscode.TreeItemCollapsibleState.None));
						}
					});
					
					break;
				default:case vscode.TreeItemCollapsibleState.None:
					break;
			}
		} else {
			deps.push(new Element("Changes", " ", 'cc_infinite' , this.historyData, vscode.TreeItemCollapsibleState.Expanded));
			
			
		}
		return Promise.resolve(deps);
	}
}




export class Element extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private version: string,
		private icon:string,
		public readonly historyData:HistoryData[],
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	){
		super(label, collapsibleState);
		this.iconPath = {
			light: path.join(__filename, '..', '..', 'images', icon + '.svg'),
			dark: path.join(__filename, '..', '..', 'images', icon + '.svg')
		};
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return this.version;
	}


	contextValue = 'element';

}