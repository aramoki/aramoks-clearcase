import * as vscode from 'vscode';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { ClearTool } from "./cleartool";
import { InputBoxOptions } from 'vscode';

let cleartool = new ClearTool();

let cclog: vscode.OutputChannel = vscode.window.createOutputChannel("Clearcase");
let viewStatus: vscode.StatusBarItem;
let fileStatus: vscode.StatusBarItem;


let options: InputBoxOptions = {
	prompt: "Comment: ",
	placeHolder: "(Enter your comment)"
};

function showMessage(message: String, iserror: boolean) {
	if (iserror) {
		if (vscode.workspace.getConfiguration("cleartool").get("showErrorMessages")) {
			vscode.window.showErrorMessage(`Error : ${message}`, 'Don\'t show informations again').then(selection => {
				if (selection) {
					if (selection === 'Don\'t show errors again') {
						vscode.workspace.getConfiguration("cleartool").update('showErrorMessages', false, vscode.ConfigurationTarget.Global);
						showOpenSettings("Error");
					}
				}
			});
		}
	} else {
		if (vscode.workspace.getConfiguration("cleartool").get("showInformationMessages")) {
			vscode.window.showInformationMessage(`${message}`, 'Don\'t show informations again').then(selection => {
				if (selection) {
					if (selection === "Don't show informations again") {
						vscode.workspace.getConfiguration("cleartool").update('showInformationMessages', false, vscode.ConfigurationTarget.Global);
						showOpenSettings("Information");
					}
				}
			});
		}
	}
	cclog.appendLine(`${message}`);
}


function showOpenSettings(type:String) {
	vscode.window.showInformationMessage("" + type + " notification feedbacks for cleartool are not visible anymore. In case you change your mind , you can find parameters to change behaviour of extension in the settings section.", 'Understood', 'Go to Settings').then(selection => {
		if (selection) {
			if (selection === 'Go to Settings') {
				vscode.commands.executeCommand('workbench.action.openSettings' , 'cleartool');
			}
		}
	});
}


function set_context_criteria(cin_criteria: boolean, cout_criteria: boolean) {
	vscode.commands.executeCommand('setContext', 'checkin-criteria', cin_criteria);
	vscode.commands.executeCommand('setContext', 'checkout-criteria', cout_criteria);
}

function cleartoolDescribeFile(textEditor: vscode.TextEditor | undefined) {
	let fileVersion: String;
	let matches: RegExpMatchArray | null;
	if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
		fileStatus.text = `$(repo-sync~spin) Describe...`;
		cleartool.run_command("describe", textEditor.document.fileName, (exception, stderr) => {
			set_context_criteria(false, false);
			fileStatus.text = `$(issue-reopened) Error`;
			viewStatus.text = `$(git-branch) No Version`;
		}, (stderr) => {
			set_context_criteria(false, false);
			fileStatus.text = `$(issue-reopened) Error`;
			viewStatus.text = `$(git-branch) No Version`;
		}, (stdout) => {

			if ((matches = stdout.match(/(?<=version:\s\\main\\).*/)) !== null) {
				fileVersion = matches.toString();
				viewStatus.text = `$(git-branch) ${fileVersion}`;
				if (stdout.indexOf("CHECKEDOUT") !== -1) {
					set_context_criteria(true, false);
					fileStatus.text = `$(verified) Checked Out`;
				} else {
					set_context_criteria(false, true);
					fileStatus.text = `$(lock) Locked`;
				}
			} else {
				viewStatus.text = `$(git-branch) No Version`;
				set_context_criteria(false, false);
				cclog.appendLine("Describe file is private ");
			}
		});
	} else {
		set_context_criteria(false, false);
	}
}


function showCommentDialog(callback: (val: String) => void) {
	if (vscode.workspace.getConfiguration("cleartool").get("actionCommentOptionDialog")) {
		vscode.window.showInputBox({
			prompt: "Type Comment to Check-Out File ",
			placeHolder: "Cannot be empty (see extension settings)"
		}).then(value => {
			if (value) {
				callback("-c " + "\"" + value + "\"");
				return;
			} else {
				return;
			}
		});
	} else {
		callback("-nc");
		return;
	}
}

export function activate(context: vscode.ExtensionContext) {



	context.subscriptions.push(viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));
	viewStatus.tooltip = "Version info of current element";
	viewStatus.text = `$(repo-sync~spin) Activating Cleartool...`;
	viewStatus.show();

	context.subscriptions.push(fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0));
	fileStatus.command = "extension.describe";
	fileStatus.tooltip = "Refresh File Status";
	fileStatus.show();



	//set status bars
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
		cleartoolDescribeFile(textEditor);
	}));


	context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Checking In...`;
		showCommentDialog((param: String) => {
			cleartool.run_command("ci " + param, uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
				cleartoolDescribeFile(vscode.window.activeTextEditor);
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Checking Out...`;
		showCommentDialog((param: String) => {
			cleartool.run_command("co " + param, uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage(stdout, false);
				cleartoolDescribeFile(vscode.window.activeTextEditor);
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
		fileStatus.text = `$(repo-sync~spin) Undo Check Out...`;
		cleartool.run_command("unco -rm", uri.fsPath, (exception, stderr) => {
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
		showCommentDialog((param: String) => {
			cleartool.run_command("mkelem " + param, uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage(stdout, false);
				cleartoolDescribeFile(vscode.window.activeTextEditor);
			});
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
