import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage("Cleartool Activated");

	vscode.commands.executeCommand('setContext', 'checkin-criteria', true);
	context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri:vscode.Uri) => {
		exec("cleartool ci \"" + uri.fsPath + "\"", (error, stdout, stderr) => {
			if (error) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
				return;
			}

			if (stderr) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
			} else {
				vscode.window.showInformationMessage(`${stdout} :: ${uri.fsPath}`);
			}
		});
	}));

	vscode.commands.executeCommand('setContext', 'checkout-criteria', true);
	context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri:vscode.Uri) => {
		exec("cleartool co \"" + uri.fsPath + "\"", (error, stdout, stderr) => {
			if (error) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
				return;
			}

			if (stderr) {
				vscode.window.showInformationMessage(`${stderr} :: ${uri.fsPath}`);
			} else {
				vscode.window.showInformationMessage(`${stdout} :: ${uri.fsPath}`);
			}
		});
	}));
}

export function deactivate() { }
