'use strict';
import * as vscode from 'vscode';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';
import { HistoryProvider } from './historyProvider';
import * as ui from './userinterface';
import { LogCat } from './logcat';
import { Glyph, fetchRealLocation, datePriorToNow } from './common';
import { HistoryData } from './historyProvider';
import { join } from 'path';

export enum CleartoolCommand {
	CheckIn = 'ci',
	CheckOut = 'co',
	UndoCheckOut = 'unco',
	MakeElement = 'mkelem',
	Describe = 'describe',
	ListHistory = 'lshist',
	Differantiate = 'diff'
}



export class ClearTool {
	private tool: string;
	private historyProvider: HistoryProvider;
	private disposables: vscode.Disposable[];

	constructor() {
		this.tool = "cleartool";
		this.historyProvider = new HistoryProvider();
		this.disposables = [];
		ui.iniStatusBar();
		this.initCleartool();
	}

	createResourceUri(relativePath: string): vscode.Uri {
		let absolutePath;
		if(vscode.workspace.rootPath){
			absolutePath = join(vscode.workspace.rootPath, relativePath);
		}else{
			absolutePath = '/';
		}
		return vscode.Uri.file(absolutePath);
	}

	private initCleartool() {


		let clearcase: vscode.SourceControl = vscode.scm.createSourceControl('ClearCase', 'Clearcase');
		let checkoutgroup: vscode.SourceControlResourceGroup = clearcase.createResourceGroup('ClearCase', 'Checked-Out');
		let groupData:vscode.SourceControlResourceState[] = checkoutgroup.resourceStates;
		/*
		checkoutgroup.resourceStates = [
			{ resourceUri: this.createResourceUri('readme.md') },
			{ resourceUri: this.createResourceUri('salben32i.md') }
		];*/

		//lsco
		//(?<=checkout\sversion\s"\.\\).*(?=")

		this.disposables.push(vscode.commands.registerCommand('extension.describe', () => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Initialise');
			this.describeFile(vscode.window.activeTextEditor);
		}));

		this.disposables.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Creating Element...', (progress,finish) => {
				progress.report({ increment: 10, message: "Fetching file..." });
				fetchRealLocation(uri.fsPath)
					.then((realFilePath: string) => {
						progress.report({ increment: 10, message: "Check configuration..." });
						ui.showCommentDialog((param: string) => {
							progress.report({ increment: 20, message: "Execute..." });
							this.runCommand(CleartoolCommand.MakeElement, param, realFilePath)
								.then((resolve: string) => {
									progress.report({ increment: 30, message: "Finishing..." });
									ui.showMessage(resolve, ui.NotificationType.Information);
									this.describeRealFile(realFilePath , progress , finish);
								})
								.catch((reject: string) => {
									progress.report({ increment: 60, message: "Finishing..." });
									ui.showMessage(reject, ui.NotificationType.Error);
								});
						});
					}).catch(() => {
						ui.hideStatusBar();
						finish();
					});
			});
		}));

		this.disposables.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Undo Check Out', (progress,finish) => {
				progress.report({ increment: 10, message: "Fetching file..." });
				fetchRealLocation(uri.fsPath)
					.then((realFilePath: string) => {
						progress.report({ increment: 10, message: "Check configuration..." });
						ui.showUncoQuickPick((param: string) => {
							progress.report({ increment: 20, message: "Execute..." });
							this.runCommand(CleartoolCommand.UndoCheckOut, param, realFilePath)
								.then((resolve: string) => {
									progress.report({ increment: 30, message: "Finishing..." });
									ui.showMessage(resolve, ui.NotificationType.Information);
									this.describeRealFile(realFilePath , progress , finish);
								})
								.catch((reject: string) => {
									progress.report({ increment: 60, message: "Finishing..." });
									ui.showMessage(reject, ui.NotificationType.Error);
									finish();
								});
						});
					}).catch(() => {
						ui.hideStatusBar();
						finish();
					});
			});
		}));

		this.disposables.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Checking Out', (progress,finish) => {
				progress.report({ increment: 10, message: "Fetching file..." });
				fetchRealLocation(uri.fsPath)
					.then((realFilePath: string) => {
						progress.report({ increment: 10, message: "Check configuration..." });
						ui.showCommentDialog((param: string) => {
							progress.report({ increment: 20, message: "Execute..." });
							this.runCommand(CleartoolCommand.CheckOut, param, realFilePath)
								.then((resolve: string) => {
									progress.report({ increment: 30, message: "Finishing..." });
									ui.showMessage(resolve, ui.NotificationType.Information);
									this.describeRealFile(realFilePath , progress , finish);
								})
								.catch((reject: string) => {
									progress.report({ increment: 60, message: "Finishing..." });
									ui.showMessage(reject, ui.NotificationType.Error);
								});
						});
					}).catch(() => {
						ui.hideStatusBar();
						finish();
					});
			});
		}));

		this.disposables.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Checking In', (progress,finish) => {
				progress.report({ increment: 10, message: "Fetching file..." });
				fetchRealLocation(uri.fsPath)
					.then((realFilePath: string) => {
						ui.showCommentDialog((param: string) => {
							progress.report({ increment: 10, message: "Check configuration..." });
							let ptime: string = (vscode.workspace.getConfiguration("cleartool").get("actionPreserveFileModificationTime")) ? ' –ptime' : '';
							progress.report({ increment: 20, message: "Execute..." });
							this.runCommand(CleartoolCommand.CheckIn, param + ptime, realFilePath)
								.then((resolve: string) => {
									progress.report({ increment: 30, message: "Finishing..." });
									ui.showMessage(resolve, ui.NotificationType.Information);
									this.describeRealFile(realFilePath , progress , finish);
								})
								.catch((reject: string) => {
									progress.report({ increment: 60, message: "Finishing..." });
									ui.showMessage(reject, ui.NotificationType.Error);
								});
						});
				}).catch(() => {
					ui.hideStatusBar();
					finish();
				});
			});
		}));

		this.disposables.push(vscode.commands.registerCommand('cleartool.compareWithPredecessor', () => {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString().startsWith("file:")) {
				fetchRealLocation(vscode.window.activeTextEditor.document.fileName)
					.then((realFilePath: string) => {
						this.compareWithPredecessor(realFilePath, this.historyProvider);
					}).catch(() => ui.hideStatusBar());
			}
		}));

		//todo: clear current history immediatelly : further we cache those
		this.disposables.push(vscode.commands.registerCommand('cleartool.showHistory', () => {
			ui.progressStatusBar(ui.StatusBarItemType.None, 'Show History', (progress, finish) => {
				progress.report({ increment: 10, message: "Initialise History..." });
				if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString().startsWith("file:")) {
					progress.report({ increment: 10, message: "Fetching file..." });
					fetchRealLocation(vscode.window.activeTextEditor.document.fileName)
						.then((realFilePath: string) => {
							progress.report({ increment: 20, message: "Parsing history..." });
							this.parseHistory(realFilePath, this.historyProvider);
							progress.report({ increment: 60, message: "Finishing..." });
							finish();
						}).catch(() => {
							ui.hideStatusBar();
							finish();
						});
				} else {
					ui.setContextCriteria(ui.FileState.Unknown);
					ui.hideStatusBar();
					finish();
				}
			});
		}));

		this.disposables.push(vscode.commands.registerCommand('cleartool.refreshHistory', () => this.historyProvider.refresh()));

		this.disposables.push(vscode.window.registerTreeDataProvider('elementHistory', this.historyProvider));

		this.disposables.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
			if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {

				checkoutgroup.resourceStates.push({resourceUri:textEditor.document.uri});


				LogCat.getInstance().log('Active Editor Changed');
				ui.progressStatusBar(ui.StatusBarItemType.FileState, 'Describe');
				fetchRealLocation(textEditor.document.fileName)
					.then((realFilePath: string) => {
						this.describeRealFile(realFilePath);
					}).catch(() => {
						ui.hideStatusBar();
					});
			} else {
				ui.setContextCriteria(ui.FileState.Unknown);
				ui.hideStatusBar();
			}
		}));
		LogCat.getInstance().log('Aramok\'s Clearcase extension initialised');
	}














	
	private runCommand(command: CleartoolCommand, param: string | null, path: string): Promise<string> {
		return new Promise((resolve, reject) => {
			LogCat.getInstance().log('execute : "' + this.tool + ' ' + command + ((param) ? ' ' + param + ' ' : ' ') + path + '"');
			exec(this.tool + ' ' + command + ((param) ? ' ' + param + ' ' : ' ') + path, (error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else {
					if (stderr) {
						reject(stderr);
					} else {
						resolve(stdout);
					}
				}
			});
		});
	}

	private compareWithPredecessor(realFilePath: string, historyProvider: HistoryProvider) {
		this.runCommand(CleartoolCommand.Differantiate, null, realFilePath)
			.then((resolve: string) => {
				let clearcase: vscode.SourceControl = vscode.scm.createSourceControl('ClearCase', 'Clearcase');
				let rg1: vscode.SourceControlResourceGroup = clearcase.createResourceGroup('ClearCase', 'CheckOuts (Reserved)');
				let rg2: vscode.SourceControlResourceGroup = clearcase.createResourceGroup('ClearCase', 'CheckOuts (Unreserved)');
				if (vscode.window.activeTextEditor) {
					rg1.resourceStates.push(
						{
							resourceUri: vscode.window.activeTextEditor.document.uri,
							command: undefined
						}
					);
				}
			})
			.catch((reject: string) => {
				ui.showMessage(reject, ui.NotificationType.Error);
			});
	}

	private describeFile(textEditor: vscode.TextEditor | undefined) {
		if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
			fetchRealLocation(textEditor.document.fileName)
				.then((realFilePath: string) => {
					this.describeRealFile(realFilePath);
				});
		} else {
			ui.setContextCriteria(ui.FileState.Unknown);
			ui.hideStatusBar();
		}
	}

	private describeRealFile(realFilePath: string ,
		progress?: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, finish?: () => void) {
		let matches: RegExpMatchArray | null;
		this.runCommand(CleartoolCommand.Describe, null, realFilePath)
			.then((resolve: string) => {
				if(progress){progress.report({message:'Command executed' , increment: 10});}
				//todo:fix regexp mathes with 'CHECKEDOUT' identifier
				let result: String = new String(resolve);
				if ((matches = result.match(/(?<=@@\\main\\).*(?=")/)) !== null) {
					if(progress){progress.report({message:'Command executed' , increment: 10});}
					let user: RegExpMatchArray | null = result.match(/(?<=\()\S*(?=\.)/);
					if (result.indexOf("CHECKEDOUT") !== -1) {
						ui.setContextCriteria(ui.FileState.CheckedOut);
						ui.viewStatus.text = `$(git-branch) ${matches.toString()}`;
						ui.fileStatus.text = `$(history) ` + ((user) ? user.toString() : ' ') + datePriorToNow(result.match(/(?<=checked out\s)(\S)*/));
						ui.fileState.text = `$(verified) Checked Out`;
					} else {
						ui.setContextCriteria(ui.FileState.Locked);
						ui.viewStatus.text = `$(git-branch) ${matches.toString()}`;
						ui.fileStatus.text = `$(history) ` + ((user) ? user.toString() : ' ') + datePriorToNow(result.match(/(?<=created\s)(\S)*(?=,|\+)/));
						ui.fileState.text = `$(lock) Locked`;
					}
				} else {
					ui.setContextCriteria(ui.FileState.Private);
					ui.viewStatus.text = `$(git-branch) No Version`;
					ui.fileStatus.text = `$(history) ` + ' ' + Glyph.EarthGround + ' -- ' + datePriorToNow(result.match(/(?<=Modified:\s).*/));
					ui.fileState.text = `$(file-code) Private File`;
				}
				if(progress){progress.report({message:'Showing Result...' , increment: 10});}
				if(finish){finish();}
			})
			.catch((reject: string) => {
				ui.setContextCriteria(ui.FileState.Unknown);
				ui.fileState.text = `$(issue-reopened) Error`;
				ui.fileStatus.hide();
				ui.viewStatus.text = `$(git-branch) No Version`;
				if(progress){progress.report({message:'Showing Result...' , increment: 30});}
				if(finish){finish();}
			});
	}

	private parseHistory(realFilePath: string, historyProvider: HistoryProvider) {
		let datas: HistoryData[] = [];
		this.runCommand(CleartoolCommand.ListHistory, null, realFilePath)
			.then((resolve: string) => {
				let result: String = new String(resolve);
				var lines = result.split('\n');
				let lastData: HistoryData;
				lines.forEach(line => {
					if (!line.startsWith('  ')) {
						//(?<=@@\\|from\s)\S*(?="|\s) // match /main/
						//(?<=@@\\)\S*(?=")
						//(?<=@@\\|from\s\\)\S*(?=\s|")
						let root: RegExpMatchArray | null = line.match(/(?<=@@\\|from\s\\)[\w|\\]*/);
						let matches: RegExpMatchArray | null = line.split(/\s+/);
						if (root) {
							if (matches) {
								let time: string = matches[0].toString();
								let username: string = matches[1].toString();
								let operation: string = matches[2].toString();
								let type: string = matches[3].toString();
								let delimiter: string[] = root.toString().split("\\");
								let seeker: HistoryData[] = datas;
								delimiter.forEach((version, index) => {
									let dataFound: HistoryData | undefined;
									dataFound = seeker.find(data => data.version === version);
									if (dataFound === undefined) {
										if (operation === 'checkout') {
											seeker.push(lastData = {
												version: version,
												icon: Glyph.CheckMark,
												username: username,
												operation: operation,
												type: type,
												time: time,
												data: []
											});
											seeker = lastData.data;
										} else {
											seeker.push(lastData = {
												version: version,
												icon: Glyph.ReturningArrow,
												username: username,
												operation: operation,
												type: type,
												time: time,
												data: []
											});
											seeker = lastData.data;
										}
									} else {
										if (index === delimiter.length - 1) {
											switch (type) {
												case 'version':
													if (dataFound.operation === 'checkout') {
														seeker.push(lastData = {
															version: version,
															icon: Glyph.ReturningArrow,
															username: username,
															operation: operation,
															type: type,
															time: time,
															data: []
														});
													}
													break;
												case 'branch':
													dataFound.data.push(lastData = {
														version: version,
														icon: Glyph.PlusSign,
														username: username,
														operation: operation,
														type: type,
														time: time,
														data: []
													});
													break;
											}
										}
										seeker = dataFound.data;
									}
								});
								if (seeker && type === 'branch') {
									//seeker.push({ version: delimiter[delimiter.length - 1] , username:username , operation:operation, type:type , time:time, data: [] });
								}
							}
						} else {
							let fname: RegExpMatchArray | null = line.match(/(?<="\.\\).*(?=@@")/);
							if (fname) {
								//todo: fix
								let time: string = matches[0].toString();
								let username: string = matches[1].toString();
								let operation: string = matches[2].toString() + ' ' + matches[3].toString();
								let type: string = matches[4].toString();
								datas.push(lastData = {
									version: fname.toString(),
									icon: Glyph.PlusSign,
									username: username,
									operation: operation,
									type: type,
									time: time,
									data: []
								});
							}
						}
					} else {
						lastData.comment = line;
					}
				});
				historyProvider.fetchHistory(datas);
			})
			.catch((reject: string) => {
				ui.showMessage(reject, ui.NotificationType.Error);
			});
	}


	public getDisposables(): vscode.Disposable[] {
		return this.disposables;
	}
}
