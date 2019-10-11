import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';

let cclog = vscode.window.createOutputChannel("Clearcase");
let myStatusBarItem: vscode.StatusBarItem;

let CachedFileInfos = new Array();

let working_directory;




export function activate(context: vscode.ExtensionContext) {

	exec("cleartool pwv", (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(`${stderr} `);
			cclog.appendLine(`${stderr} `);
			return;
		}

		if (stderr) {
			vscode.window.showErrorMessage(`${stderr} `);
			cclog.appendLine(`${stderr} `);
		} else {
			
			vscode.window.showInformationMessage(`${stdout.split('\n')[0]}`);
			cclog.appendLine(`${stderr}`);
		}
	});


	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	myStatusBarItem.command = 'sample.showSelectionCount';
	context.subscriptions.push(myStatusBarItem);

	vscode.commands.executeCommand('setContext', 'checkin-criteria', true);
	vscode.commands.executeCommand('setContext', 'checkout-criteria', true);

	context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
		exec("cleartool ci -nc " + uri.fsPath + "", (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`${stderr} :: ${uri.fsPath}`);
				cclog.appendLine(`${stderr} :: ${uri.fsPath}`);
				return;
			}
			if (stderr) {
				vscode.window.showErrorMessage(`${stderr} :: ${uri.fsPath}`);
				cclog.appendLine(`${stderr} :: ${uri.fsPath}`);
			} else {
				vscode.window.showInformationMessage(`${stdout} :: ${uri.fsPath}`);
				cclog.appendLine(`${stdout} :: ${uri.fsPath}`);
			}
		});
	}));




	context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
		exec("cleartool co -nc " + uri.fsPath + "", (error, stdout, stderr) => {
			if (error) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
				cclog.appendLine(`${stderr} :: ${uri.fsPath}`);
				return;
			}

			if (stderr) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
				cclog.appendLine(`${stderr} :: ${uri.fsPath}`);
			} else {
				vscode.window.showInformationMessage(`${stdout} :: ${uri.fsPath}`);
				cclog.appendLine(`${stderr} :: ${uri.fsPath}`);
			}
		});
	}));




	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
		if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
			//CachedFileInfos required to be cleaned for certain time...
			if (CachedFileInfos.find(val => val === textEditor.document.fileName) !== undefined) {
				cclog.appendLine("Allready exist :: " + textEditor.document.fileName);
			} else {
				CachedFileInfos.push(textEditor.document.fileName);
				cclog.appendLine("Added :: " + textEditor.document.languageId);
			}

			myStatusBarItem.text = `$(git-branch) $(lock) Checked V: @${CachedFileInfos.length} ${textEditor.document.languageId}`;
			myStatusBarItem.show();

		} else {
			myStatusBarItem.hide();
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
		cclog.appendLine("on Did Open Text Document :: " + textDocument.fileName);
	}));

	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((textDocument: vscode.TextDocument) => {
		cclog.appendLine("on Did Close Text Document :: " + textDocument.fileName);
	}));
}


export function deactivate() {
}
