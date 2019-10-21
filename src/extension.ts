import * as vscode from 'vscode';
import { ClearTool } from "./cleartool";
import { LogCat } from './logcat';


let cleartool: ClearTool ;

export function activate(context: vscode.ExtensionContext) {
	LogCat.getInstance();
	cleartool = new ClearTool();
	
	context.subscriptions.concat(cleartool.getDisposables());
	vscode.commands.executeCommand('extension.describe');
}



export function deactivate() {

}
