import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';

let cclog = vscode.window.createOutputChannel("Clearcase");

let viewStatus: vscode.StatusBarItem;
let fileStatus: vscode.StatusBarItem;


//define class , parse and store cached files in it
let CachedFileInfos = new Array();


export function activate(context: vscode.ExtensionContext) {
	//check if cleartool exist
	exec("cleartool ver", (error, stdout, stderr) => {
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

			//check if directory is clearcase view
			exec("cleartool pwv", (error, stdout, stderr) => {
				if (error) {
					vscode.window.showErrorMessage(`${stderr}`);
					cclog.appendLine(`${stderr}`);
					return;
				}
				if (stderr) {
					vscode.window.showErrorMessage(`${stderr} `);
					cclog.appendLine(`${stderr}`);
				} else {
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

							exec("cleartool describe " + textEditor.document.fileName + "", (error, stdout, stderr) => {
								if (error) {
									vscode.window.showErrorMessage(`${stderr} `);
									cclog.appendLine(`${stderr} `);
									vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
									vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
									return;
								}
								if (stderr) {
									vscode.window.showErrorMessage(`${stderr} `);
									cclog.appendLine(`${stderr} `);
									vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
									vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
								} else {
									vscode.window.showInformationMessage(`${stdout} `);
									cclog.appendLine(`${stdout} `);
									if(stdout.indexOf("CHECKEDOUT") !== -1){
										vscode.commands.executeCommand('setContext', 'checkin-criteria', true);
										vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
										fileStatus.text = `$(verified) CHECKEDOUT`;
									}else{
										vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
										vscode.commands.executeCommand('setContext', 'checkout-criteria', true);
										fileStatus.text = `$(lock) LOCKED`;
									}
									fileStatus.show();
								}
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

					context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
						exec("cleartool unco -nc " + uri.fsPath + "", (error, stdout, stderr) => {
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

					context.subscriptions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
						exec("cleartool mkelem -nc " + uri.fsPath + "", (error, stdout, stderr) => {
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
				}
			});
		}
	});



}


export function deactivate() {
}
