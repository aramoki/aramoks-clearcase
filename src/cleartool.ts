'use strict';
import * as vscode from 'vscode';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';
import { HistoryProvider } from './historyProvider';
import * as ui from './userinterface';
import { LogCat } from './logcat';
import * as config from './configuration';
import * as common from './common';
import { HistoryData } from './historyProvider';


export class ClearTool {
	tool: string;
	historyProvider: HistoryProvider;
	private actions: vscode.Disposable[];

	constructor() {
		this.tool = "cleartool";
		this.historyProvider = new HistoryProvider();
		this.actions = [];

		ui.iniStatusBar();

		this.actions.push(vscode.commands.registerCommand('extension.describe', () => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Initialise...`);
			this.DescribeFile(vscode.window.activeTextEditor);
		}));

		this.actions.push(vscode.commands.registerCommand('extension.makeelement', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Creating Element...`);
			common.fetchRealLocation(uri.fsPath)
				.then((realFilePath: string) => {
					ui.showCommentDialog((param: String) => {
						this.runCommand('mkelem ' + param, realFilePath)
							.then((resolve: string) => {
								ui.showMessage(resolve, ui.NotificationType.Information);
								this.DescribeRealFile(realFilePath);
							})
							.catch((reject: string) => {
								ui.showMessage(reject, ui.NotificationType.Error);
							});
					});
				}).catch(() => ui.hideStatusBar());
		}));

		this.actions.push(vscode.commands.registerCommand('extension.undocheckout', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Undo Check Out...`);
			common.fetchRealLocation(uri.fsPath)
				.then((realFilePath: string) => {
					this.runCommand('unco -rm', realFilePath)
						.then((resolve: string) => {
							ui.showMessage(resolve, ui.NotificationType.Information);
							this.DescribeRealFile(realFilePath);
						})
						.catch((reject: string) => {
							ui.showMessage(reject, ui.NotificationType.Error);
						});
				}).catch(() => ui.hideStatusBar());
		}));

		this.actions.push(vscode.commands.registerCommand('extension.checkout', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Checking Out...`);
			common.fetchRealLocation(uri.fsPath)
				.then((realFilePath: string) => {
					ui.showCommentDialog((param: string) => {
						this.runCommand('co ' + param, realFilePath)
							.then((resolve: string) => {
								ui.showMessage(resolve, ui.NotificationType.Error);
							})
							.catch((reject: string) => {
								ui.showMessage(reject, ui.NotificationType.Information);
								this.DescribeRealFile(realFilePath);
							});
					});
				}).catch(() => ui.hideStatusBar());
		}));

		this.actions.push(vscode.commands.registerCommand('extension.checkin', (uri: vscode.Uri) => {
			ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Checking In...`);
			common.fetchRealLocation(uri.fsPath)
				.then((realFilePath: string) => {
					ui.showCommentDialog((param: string) => {
						this.runCommand('ci ' + param, realFilePath)
							.then((resolve: string) => {
								ui.showMessage(resolve, ui.NotificationType.Error);
							})
							.catch((reject: string) => {
								ui.showMessage(reject, ui.NotificationType.Information);
								this.DescribeRealFile(realFilePath);
							});
					});
				}).catch(() => ui.hideStatusBar());
		}));

		this.actions.push(vscode.commands.registerCommand('cleartool.compareWithPredecessor', () => {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString().startsWith("file:")) {
				common.fetchRealLocation(vscode.window.activeTextEditor.document.fileName)
					.then((realFilePath: string) => {
						this.compareWithPredecessor(realFilePath, this.historyProvider);
					}).catch(() => ui.hideStatusBar());
			}
		}));

		//todo: clear current history immediatelly : further we cache those
		this.actions.push(vscode.commands.registerCommand('cleartool.showHistory', () => {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString().startsWith("file:")) {
				common.fetchRealLocation(vscode.window.activeTextEditor.document.fileName)
					.then((realFilePath: string) => {
						this.ParseHistory(realFilePath, this.historyProvider);
					}).catch(() => ui.hideStatusBar());
			} else {
				ui.setContextCriteria(ui.FileState.Unknown);
				ui.hideStatusBar();
			}
		}));

		this.actions.push(vscode.commands.registerCommand('cleartool.refreshHistory', () => this.historyProvider.refresh()));

		this.actions.push(vscode.window.registerTreeDataProvider('elementHistory', this.historyProvider));

		this.actions.push(vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined): void => {
			if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
				ui.progressStatusBar(ui.StatusBarItemType.FileState, `$(repo-sync~spin) Describe...`);
				common.fetchRealLocation(textEditor.document.fileName)
					.then((realFilePath: string) => {
						this.DescribeRealFile(realFilePath);
					}).catch(() => ui.hideStatusBar());
			} else {
				ui.setContextCriteria(ui.FileState.Unknown);
				ui.hideStatusBar();
			}
		}));

	}

	getDisposables(): vscode.Disposable[] {
		return this.actions;
	}

	runCommand(command: string, path: string): Promise<string> {
		return new Promise((resolve, reject) => {
			exec(this.tool + " " + command + " " + path + "", (error, stdout, stderr) => {
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

	run_command(command: String, path: String, c_error: (exception: ExecException, val: String) => void, std_error: (val: string) => void, std_success: (val: string) => void): void {
		exec(this.tool + " " + command + " " + path + "", (error, stdout, stderr) => {
			if (error) {
				c_error(error, stderr);
				return;
			}
			if (stderr) {
				std_error(stderr);
			} else {
				std_success(stdout);
			}
		});
	}

	compareWithPredecessor(realFilePath: string, historyProvider: HistoryProvider) {
		this.runCommand('diff ', realFilePath)
			.then((resolve: string) => {
				LogCat.getInstance().log(resolve);
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

	DescribeFile(textEditor: vscode.TextEditor | undefined) {
		if (textEditor && textEditor.document.uri.toString().startsWith("file:")) {
			common.fetchRealLocation(textEditor.document.fileName)
				.then((realFilePath: string) => {
					this.DescribeRealFile(realFilePath);
				});
		} else {
			ui.setContextCriteria(ui.FileState.Unknown);
			ui.hideStatusBar();
		}
	}

	DescribeRealFile(realFilePath: string) {
		let matches: RegExpMatchArray | null;
		this.runCommand('describe', realFilePath)
			.then((resolve: string) => {
				//todo:fix regexp mathes with 'CHECKEDOUT' identifier
				if ((matches = resolve.match(/(?<=@@\\main\\).*(?=")/)) !== null) {
					let user: RegExpMatchArray | null = resolve.match(/(?<=\()\S*(?=\.)/);
					if (resolve.indexOf("CHECKEDOUT") !== -1) {
						ui.setContextCriteria(ui.FileState.CheckedOut);
						ui.viewStatus.text = `$(git-branch) ${matches.toString()}`;
						ui.fileStatus.text = `$(history) ` + ((user) ? user.toString() : ' ') + common.datePriorToNow(resolve.match(/(?<=checked out\s)(\S)*/));
						ui.fileState.text = `$(verified) Checked Out`;
					} else {
						ui.setContextCriteria(ui.FileState.Locked);
						ui.viewStatus.text = `$(git-branch) ${matches.toString()}`;
						ui.fileStatus.text = `$(history) ` + ((user) ? user.toString() : ' ') + common.datePriorToNow(resolve.match(/(?<=created\s)(\S)*(?=,|\+)/));
						ui.fileState.text = `$(lock) Locked`;
					}
				} else {
					ui.setContextCriteria(ui.FileState.Private);
					ui.viewStatus.text = `$(git-branch) No Version`;
					ui.fileStatus.text = `$(history) ` + ' \u23DA -- ' + common.datePriorToNow(resolve.match(/(?<=Modified:\s).*/));
					ui.fileState.text = `$(file-code) Private File`;
				}
			})
			.catch((reject: string) => {
				ui.setContextCriteria(ui.FileState.Unknown);
				ui.fileState.text = `$(issue-reopened) Error`;
				ui.fileStatus.hide();
				ui.viewStatus.text = `$(git-branch) No Version`;
			});
	}

	ParseHistory(realFilePath: string, historyProvider: HistoryProvider) {
		let datas: HistoryData[] = [];
		this.runCommand('lshistory ', realFilePath)
			.then((resolve: string) => {
				var lines = resolve.split('\n');
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
												icon: '\u2713',
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
												icon: '\u2937',
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
															icon: '\u2937',
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
														icon: '\u002B',
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
								LogCat.getInstance().log(line + '' + fname.toString());
								let time: string = matches[0].toString();
								let username: string = matches[1].toString();
								let operation: string = matches[2].toString() + ' ' + matches[3].toString();
								let type: string = matches[4].toString();
								datas.push(lastData = {
									version: fname.toString(),
									icon: '\u002B',
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
}
