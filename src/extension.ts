import * as vscode from 'vscode';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { ClearTool } from "./cleartool";

let cleartool = new ClearTool();

let cclog : vscode.OutputChannel = vscode.window.createOutputChannel("Clearcase");
let viewStatus: vscode.StatusBarItem;
let fileStatus: vscode.StatusBarItem;

function showMessage(message: String, iserror: boolean) {
	if (iserror) {
		vscode.window.showErrorMessage(`Error : ${message}`);
	} else {
		vscode.window.showInformationMessage(`${message}`);
	}
	cclog.appendLine(`${message}`);
}


function set_context_criteria(cin_criteria: boolean, cout_criteria: boolean) {
	vscode.commands.executeCommand('setContext', 'checkin-criteria', cin_criteria);
	vscode.commands.executeCommand('setContext', 'checkout-criteria', cout_criteria);
}

function cleartoolDescribeFile(textEditor: vscode.TextEditor | undefined){
	let fileVersion:String;
	let matches : RegExpMatchArray | null;
	if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
		fileStatus.text = `$(repo-sync~spin) Describe...`;
		cleartool.run_command("describe", textEditor.document.fileName, (exception, stderr) => {
			set_context_criteria(false, false);
			fileStatus.text = `$(issue-reopened) Error`;
		}, (stderr) => {
			set_context_criteria(false, false);
			fileStatus.text = `$(issue-reopened) Error`;
		}, (stdout) => {
			
			if((matches = stdout.match(/(?<=version:\s\\main\\).*/)) !== null){
				fileVersion = matches.toString();
				viewStatus.text = `$(git-branch) ${fileVersion}`;
			}else{
				viewStatus.text = `$(git-branch) No Version`;
			}

			if (stdout.indexOf("version") !== -1) {
				if (stdout.indexOf("CHECKEDOUT") !== -1) {
					set_context_criteria(true, false);
					fileStatus.text = `$(verified) Checked Out`;
				} else {
					set_context_criteria(false, true);
					fileStatus.text = `$(lock) Locked`;
				}
			}else{
				set_context_criteria(false, false);
				cclog.appendLine("Describe file is private ");
			}
			fileStatus.show();
		});
	} else {
		set_context_criteria(false, false);
		fileStatus.hide();
	}
}

export function activate(context: vscode.ExtensionContext) {



	context.subscriptions.push(viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));
	viewStatus.tooltip = "Version info of current element"
	viewStatus.text = `$(repo-sync~spin) Activating Cleartool...`;
	viewStatus.show();

	context.subscriptions.push(fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0));
	fileStatus.command = "extension.describe";
	fileStatus.tooltip = "Refresh File Status"




	//set status bars
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
		cleartoolDescribeFile(textEditor);
	}));


	context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Checking In...`;
		cleartool.run_command("ci -nc", uri.fsPath , (exception, stderr) => {
			showMessage(stderr, true);
		}, (stderr) => {
			showMessage(stderr, true);
		}, (stdout) => {
			showMessage("Result:" + stdout, false);
			cleartoolDescribeFile(vscode.window.activeTextEditor);
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Checking Out...`;
		cleartool.run_command("co -nc", uri.fsPath , (exception, stderr) => {
			showMessage(stderr, true);
		}, (stderr) => {
			showMessage(stderr, true);
		}, (stdout) => {
			showMessage(stdout, false);
			cleartoolDescribeFile(vscode.window.activeTextEditor);
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Undo Check Out...`;
		cleartool.run_command("unco -rm", uri.fsPath , (exception, stderr) => {
			showMessage(stderr, true);
		}, (stderr) => {
			showMessage(stderr, true);
		}, (stdout) => {
			showMessage(stdout, false);
			cleartoolDescribeFile(vscode.window.activeTextEditor);
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Creating Element...`;
		cleartool.run_command("mkelem -nc", uri.fsPath , (exception, stderr) => {
			showMessage(stderr, true);
		}, (stderr) => {
			showMessage(stderr, true);
		}, (stdout) => {
			showMessage(stdout, false);
			cleartoolDescribeFile(vscode.window.activeTextEditor);
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.describe', () => {
		fileStatus.text = `$(repo-sync~spin) Describe...`;
		cleartoolDescribeFile(vscode.window.activeTextEditor);
	}));

	vscode.commands.executeCommand('extension.describe');
}



export function deactivate() {
}
