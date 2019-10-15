import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';
import { ClearTool } from "./cleartool";

let cleartool = new ClearTool();

let cclog = vscode.window.createOutputChannel("Clearcase");
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


function set_context_criteria(cin_criteria:boolean , cout_criteria : boolean){
	vscode.commands.executeCommand('setContext', 'checkin-criteria', cin_criteria);
	vscode.commands.executeCommand('setContext', 'checkout-criteria', cout_criteria);
}


export function activate(context: vscode.ExtensionContext) {

	//check if cleartool exist
	cleartool.run_command("pwv", "", (exception, stderr) => {
		showMessage(stderr, true);
	}, (stderr) => {
		showMessage(stderr, true);
	}, (stdout) => {
		context.subscriptions.push(viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));
		context.subscriptions.push(fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0));
		viewStatus.text = `$(git-branch) ${stdout.match(/(?<=\bview:\s).*/)}`;
		viewStatus.show();


		//set status bars
		context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
			if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
				cleartool.run_command("describe", textEditor.document.fileName, (exception, stderr) => {
					set_context_criteria(false,false);
				}, (stderr) => {
					set_context_criteria(false,false);
				}, (stdout) => {
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						set_context_criteria(true,false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						set_context_criteria(false,true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			} else {
				set_context_criteria(false,false);
				fileStatus.hide();
			}
		}));


		context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
			//cclog.appendLine("on Did Open Text Document :: " + textDocument.fileName);
		}));

		context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((textDocument: vscode.TextDocument) => {
			//cclog.appendLine("on Did Close Text Document :: " + textDocument.fileName);
		}));

		//right click context
		context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
			cleartool.run_command("ci -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
				cleartool.run_command("describe", uri.fsPath, (exception, stderr) => {
					set_context_criteria(false,false);
				}, (stderr) => {
					set_context_criteria(false,false);
				}, (stdout) => {
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						set_context_criteria(true,false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						set_context_criteria(false,true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
			cleartool.run_command("co -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
				cleartool.run_command("describe", uri.fsPath, (exception, stderr) => {
					set_context_criteria(false,false);
				}, (stderr) => {
					set_context_criteria(false,false);
				}, (stdout) => {
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						set_context_criteria(true,false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						set_context_criteria(false,true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
			cleartool.run_command("unco -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
				cleartool.run_command("describe", uri.fsPath, (exception, stderr) => {
					set_context_criteria(false,false);
				}, (stderr) => {
					set_context_criteria(false,false);
				}, (stdout) => {
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						set_context_criteria(true,false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						set_context_criteria(false,true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			});
		}));

		context.subscriptions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
			cleartool.run_command("mkelem -nc", uri.fsPath, (exception, stderr) => {
				showMessage(stderr, true);
			}, (stderr) => {
				showMessage(stderr, true);
			}, (stdout) => {
				showMessage("Result:" + stdout, false);
				cleartool.run_command("describe", uri.fsPath, (exception, stderr) => {
					set_context_criteria(false,false);
				}, (stderr) => {
					set_context_criteria(false,false);
				}, (stdout) => {
					if (stdout.indexOf("CHECKEDOUT") !== -1) {
						set_context_criteria(true,false);
						fileStatus.text = `$(verified) CHECKEDOUT`;
					} else {
						set_context_criteria(false,true);
						fileStatus.text = `$(lock) LOCKED`;
					}
					fileStatus.show();
				});
			});
		}));
	});

}


export function deactivate() {
}
