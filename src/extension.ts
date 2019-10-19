import * as vscode from 'vscode';
import * as fs from 'fs';
import { ClearTool } from "./cleartool";
import { HistoryProvider } from "./historyProvider";
import { InputBoxOptions } from 'vscode';
import {HistoryData} from './extension';

enum FileState {
	Locked,
	CheckedOut,
	Private,
	Unknown
}

enum NotificationType {
	Information,
	Warning,
	Error
}


export interface HistoryData{
	data:HistoryData[];
	title:string;
	sub:string;
}

let cleartool = new ClearTool();
let cclog: vscode.OutputChannel = vscode.window.createOutputChannel("Clearcase");
let viewStatus: vscode.StatusBarItem;
let fileState: vscode.StatusBarItem;
let fileStatus: vscode.StatusBarItem;

let options: InputBoxOptions = {
	prompt: "Comment: ",
	placeHolder: "(Enter your comment)"
};

function showMessage(message: String, type: NotificationType) {
	switch (type) {
		case NotificationType.Information:
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
			break;
		case NotificationType.Error:
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
			break;
		default: case NotificationType.Warning:
			break;
	}
	cclog.appendLine(`${message}`);
}


function showOpenSettings(type: String) {
	vscode.window.showInformationMessage("" + type + " notification feedbacks for cleartool are not visible anymore. In case you change your mind , you can find parameters to change behaviour of extension in the settings section.", 'Understood', 'Go to Settings').then(selection => {
		if (selection) {
			if (selection === 'Go to Settings') {
				vscode.commands.executeCommand('workbench.action.openSettings', 'cleartool');
			}
		}
	});
}

function setContextCriteria(state: FileState) {
	switch (state) {
		case FileState.Locked:
			vscode.commands.executeCommand('setContext', 'mkelem-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkout-criteria', true);
			break;
		case FileState.CheckedOut:
			vscode.commands.executeCommand('setContext', 'mkelem-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkin-criteria', true);
			vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
			break;
		case FileState.Private:
			vscode.commands.executeCommand('setContext', 'mkelem-criteria', true);
			vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
			break;
		case FileState.Unknown: default:
			vscode.commands.executeCommand('setContext', 'mkelem-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkin-criteria', false);
			vscode.commands.executeCommand('setContext', 'checkout-criteria', false);
			break;
	}
}

function realLocation(path: fs.PathLike, callback: (realFilePath: String) => void) {
	let realFile: String;
	fs.lstat(path, function (err, stats) {
		if (err) {
			//callback("\"" + path.toString() + "\"");
		}
		if (stats.isSymbolicLink()) {
			fileState.text = `$(repo-sync~spin) Symbolic Describe...`;
			fs.readlink(path, (err: NodeJS.ErrnoException | null, linkstring: String) => {
				callback("\"" + linkstring + "\"");
			});
		} else {
			callback("\"" + path.toString() + "\"");
		}
	});
}

function cleartoolDescribeRealFile(realFilePath: String) {
	let matches: RegExpMatchArray | null;

	checkConfigForStatusBar( fileState , 'statusBarShowFileState');
	checkConfigForStatusBar( fileStatus , 'statusBarShowFileInfo');
	checkConfigForStatusBar( viewStatus , 'statusBarShowViewStatus');

	cleartool.run_command("describe", realFilePath, (exception, stderr) => {
		setContextCriteria(FileState.Unknown);
		fileState.text = `$(issue-reopened) Error`;
		fileStatus.hide();
		viewStatus.text = `$(git-branch) No Version`;
	}, (stderr) => {
		setContextCriteria(FileState.Unknown);
		fileState.text = `$(issue-reopened) Error`;
		fileStatus.hide();
		viewStatus.text = `$(git-branch) No Version`;
	}, (stdout) => {
		if ((matches = stdout.match(/(?<=version:\s\\main\\).*/)) !== null) {
			viewStatus.text = `$(git-branch) ${matches.toString()}`;
			if (stdout.indexOf("CHECKEDOUT") !== -1) {
				setContextCriteria(FileState.CheckedOut);
				fileStatus.text = `$(git-branch) ` + datePriorToNowRexExp(stdout.match(/(?<=checked out\s)(\S)*/));
				fileState.text = `$(verified) Checked Out`;
			} else {
				setContextCriteria(FileState.Locked);
				fileStatus.text = `$(git-branch) ` + datePriorToNowRexExp(stdout.match(/(?<=created\s)(\S)*(?=,|\+)/));
				fileState.text = `$(lock) Locked`;
			}
		} else {
			setContextCriteria(FileState.Private);
			viewStatus.text = `$(git-branch) No Version`;
			fileStatus.text = `$(git-branch) ` + datePriorToNowRexExp(stdout.match(/(?<=Modified:\s).*/));
			fileState.text = `$(file-code) Private File`;
		}
	});
}

function cleartoolDescribeFile(textEditor: vscode.TextEditor | undefined) {
	if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
		fileState.text = `$(repo-sync~spin) Describe...`;
		realLocation(textEditor.document.fileName, (realFilePath: String) => {
			cleartoolDescribeRealFile(realFilePath);
		});
	} else {
		setContextCriteria(FileState.Unknown);
		fileState.hide();
		fileStatus.hide();
		viewStatus.hide();
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

function datePriorToNowRexExp(now:RegExpMatchArray|null): string{
	if(now){
		return datePriorToNow(new Date(now[0].toString()));
	}else{
		return ' -- ';
	}
}

function datePriorToNowString(now:string): string{
	if(now){
		return datePriorToNow(new Date(now));
	}else{
		return ' --- ';
	}
}

function datePriorToNow(now: Date): string {
	let dateTime:number = ((new Date()).valueOf() - now.valueOf());
	var msPerMinute = 60 * 1000;
	var msPerHour = msPerMinute * 60;
	var msPerDay = msPerHour * 24;
	var msPerMonth = msPerDay * 30;
	var msPerYear = msPerDay * 365;
	if (dateTime < msPerMinute) {
		return Math.round(dateTime/1000) + ' seconds ago';   
	}else if (dateTime < msPerHour) {
		return Math.round(dateTime/msPerMinute) + ' minutes ago';   
	}else if (dateTime < msPerDay ) {
		return Math.round(dateTime/msPerHour ) + ' hours ago';   
	}else if (dateTime < msPerMonth) {
		return '~' + Math.round(dateTime/msPerDay) + ' days ago';   
	}else if (dateTime < msPerYear) {
        return '~' + Math.round(dateTime/msPerMonth) + ' months ago';   
    }else {
        return '~' + Math.round(dateTime/msPerYear ) + ' years ago';   
    }
}

function checkConfigForStatusBar(item:vscode.StatusBarItem , config:string){
	if (vscode.workspace.getConfiguration('cleartool').get(config)) {
		item.show();
	}else{
		item.hide();
	}
}
	function recPushJson(json:any, index:number, key:string[] , data:string):any {
		if(index !== 0){
			return recPushJson(json[key[index] + 's'] , index-1 , key ,data);
		}else{
			return data;
		}
	}

export function activate(context: vscode.ExtensionContext) {
	const historyProvider = new HistoryProvider();

	context.subscriptions.push(viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2));
	viewStatus.tooltip = "Version info of current element";
	viewStatus.text = `$(repo-sync~spin) Activating Cleartool...`;
	viewStatus.show();
	context.subscriptions.push(fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));
	//fileState.command = "extension.describe";//will be history
	fileStatus.tooltip = "Click for Full History";
	fileStatus.show();
	context.subscriptions.push(fileState = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0));
	fileState.command = "extension.describe";
	fileState.tooltip = "Refresh File Status";
	fileState.show();





	vscode.window.registerTreeDataProvider('elementHistory', historyProvider);
	vscode.commands.registerCommand('cleartool.refreshHistory', () => historyProvider.refresh());



	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
		cleartoolDescribeFile(textEditor);
		let datas:HistoryData[] = [];
		cleartool.run_command("lshistory ", "asd", (exception, stderr) => {
			showMessage(stderr, NotificationType.Error);
		}, (stderr) => {
			showMessage(stderr, NotificationType.Error);
		}, (stdout) => {
			var lines = stdout.split('\n');
			lines.forEach(line => {
				if(!line.startsWith('  ')){
					var matches: RegExpMatchArray | null = line.split(/\s+/);
					if(matches){
						var time = matches[0];
						var username = matches[1];
						var operation = matches[2];
						var type = matches[3];
						//(?<=@@\\|from\s)\S*(?="|\s) // match /main/
						//(?<=@@\\)\S*(?=")
						//(?<=@@\\|from\s\\)\S*(?=\s|")
						var root = line.match(/(?<=@@\\|from\s\\)[\w|\\]*/);
						if(root){
							let delimiter:string[] = root.toString().split("\\");
							let seeker:HistoryData[] = datas;

							delimiter.forEach((delim , index) => {
								let dataFound:HistoryData|undefined;
								dataFound = seeker.find(data => data.title === delim);
								if(dataFound === undefined){
									let newone:HistoryData;
									seeker.push(newone = {title:delim , sub: '\u2937 ' + operation + " " + type + ' \u2022 ' + username + ' ' +  time, data:[]});
									seeker = newone.data;
								}else{
									seeker = dataFound.data;
									if(index === delimiter.length - 1){
										//dataFound.sub += '\u21c4 ' + operation + " " + type + ' \u2022 ' + username + ' ' +  time;
										dataFound.data.push({title:delim , sub: '\u2937 ' + operation + " " + type + ' \u2022 ' + username + ' ' +  time, data:[]});
									}
								}
							});
							if(seeker){
								//seeker.push({title:operation + " " + type + " @" + username, sub: '\u2937 ' + operation + " " + type + ' \u2022 ' + username + ' \u21c4 ' +  time, data:[]});
							}
						}else{
							cclog.appendLine(line);
						}
					}
				}
			});
			
				/*
				datas.forEach(element1 => {
					cclog.appendLine(element1.title + " > ");
					element1.data.forEach(element2 => {
						cclog.appendLine("\t" + element2.title + " > ");
						element2.data.forEach(element3 => {
							cclog.appendLine("\t\t" + element3.title + " > ");
							element3.data.forEach(element4 => {
								cclog.appendLine("\t\t\t" + element4.title + " > ");
								element4.data.forEach(element5 => {
									cclog.appendLine("\t\t\t\t" + element5.title + " - ");
								});
							});
						});
					});
				});
				*/
			historyProvider.fetchHistory(datas);
		});

	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
		fileState.text = `$(repo-sync~spin) Checking In...`;
		realLocation(uri.fsPath, (realFilePath: String) => {
			showCommentDialog((param: String) => {
				cleartool.run_command("ci " + param, realFilePath, (exception, stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stdout) => {
					showMessage(stdout, NotificationType.Information);
					cleartoolDescribeRealFile(realFilePath);
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
		fileState.text = `$(repo-sync~spin) Checking Out...`;
		realLocation(uri.fsPath, (realFilePath: String) => {
			showCommentDialog((param: String) => {
				cleartool.run_command("co " + param, realFilePath, (exception, stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stdout) => {
					showMessage(stdout, NotificationType.Information);
					cleartoolDescribeRealFile(realFilePath);
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
		fileState.text = `$(repo-sync~spin) Undo Check Out...`;
		realLocation(uri.fsPath, (realFilePath: String) => {
			cleartool.run_command("unco -rm", realFilePath, (exception, stderr) => {
				showMessage(stderr, NotificationType.Error);
			}, (stderr) => {
				showMessage(stderr, NotificationType.Error);
			}, (stdout) => {
				showMessage(stdout, NotificationType.Information);
				cleartoolDescribeRealFile(realFilePath);
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
		fileState.text = `$(repo-sync~spin) Creating Element...`;
		realLocation(uri.fsPath, (realFilePath: String) => {
			showCommentDialog((param: String) => {
				cleartool.run_command("mkelem " + param, realFilePath, (exception, stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stderr) => {
					showMessage(stderr, NotificationType.Error);
				}, (stdout) => {
					showMessage(stdout, NotificationType.Information);
					cleartoolDescribeRealFile(realFilePath);
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.describe', () => {
		fileState.text = `$(repo-sync~spin) Initialise...`;
		cleartoolDescribeFile(vscode.window.activeTextEditor);
	}));

	vscode.commands.executeCommand('extension.describe');
}



export function deactivate() {
}
