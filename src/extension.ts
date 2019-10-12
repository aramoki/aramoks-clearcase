import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';
import { ClearTool } from "./cleartool";

let cleartool = new ClearTool();

let cclog = vscode.window.createOutputChannel("Clearcase");
let viewStatus: vscode.StatusBarItem;
let fileStatus: vscode.StatusBarItem;
let CachedFileInfos = new Array();

function showMessage(message: String, iserror: boolean) {
	if (iserror) {
		vscode.window.showErrorMessage(`Error : ${message}`);
	} else {
		vscode.window.showInformationMessage(`${message}`);
	}
	cclog.appendLine(`${message}`);
}


export function activate(context: vscode.ExtensionContext) {
	//check if cleartool exist

	cleartool.run_command("pwv", "", (exception, stderr) => {
		showMessage(stderr, true);
	}, (stderr) => {
		showMessage(stderr, true);
	}, (stdout) => {
		showMessage("Result:" + stdout, false);
		vscode.window.showInformationMessage(`${stdout.match(/(?<=\bview:\s)(\w+)$/g)}`);
		cclog.appendLine(`---${stdout.split(':\n', 1)[0]}`);

		context.subscriptions.push(viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));
		context.subscriptions.push(fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0));

		viewStatus.text = `$(git-branch) ${stdout.match(/(?<=\bview:\s)(\w+)$/g)}`;
		viewStatus.show();


		//set status bars
		context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
			if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
				//CachedFileInfos required to be cleaned for certain time for each file
				if (CachedFileInfos.find(val => val === textEditor.document.fileName) !== undefined) {
					cclog.appendLine("Allready exist :: " + textEditor.document.fileName);
				} else {
					CachedFileInfos.push(textEditor.document.fileName);
					cclog.appendLine("Added :: " + textEditor.document.languageId);
				}

				cleartool.run_command("describe", textEditor.document.fileName, (exception, stderr) => {
					showMessage(stderr, true);
					vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
					vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
				}, (stderr) => {
					showMessage(stderr, true);
					vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
					vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
				}, (stdout) => {
					showMessage("Result:" + stdout, false);
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						vscode.commands.executeCommand('setContext', 'checkin-criteria', true);
						vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
						vscode.commands.executeCommand('setContext', 'checkout-criteria', true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			} else {
				vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
				vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
				fileStatus.hide();
			}
		}));


		context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
			cclog.appendLine("on Did Open Text Document :: " + textDocument.fileName);
		}));

		context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((textDocument: vscode.TextDocument) => {
			cclog.appendLine("on Did Close Text Document :: " + textDocument.fileName);
		}));

		//right click context
		context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
			cleartool.run_command("ci -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
			cleartool.run_command("co -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
			cleartool.run_command("unco -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
			cleartool.run_command("mkelem -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
			});
		}));



	});



}


export function deactivate() {
}
