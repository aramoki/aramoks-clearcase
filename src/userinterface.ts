'use strict';
import * as vscode from 'vscode';
import { LogCat } from './logcat';
import * as config from './configuration';

export enum NotificationType {
	Information,
	Warning,
	Error
}

export enum FileState {
	Locked,
	CheckedOut,
	Private,
	Unknown
}

export enum StatusBarItemType {
	ViewStatus,
	FileStatus,
	FileState,
	None
}

export let viewStatus: vscode.StatusBarItem;
export let fileStatus: vscode.StatusBarItem;
export let fileState: vscode.StatusBarItem;

export function iniStatusBar() {
	viewStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	viewStatus.tooltip = "Version info of current element";
	viewStatus.text = `$(repo-sync~spin) Activating Cleartool...`;

	fileStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	fileStatus.command = "cleartool.showHistory";
	fileStatus.tooltip = "Click for Full History";

	fileState = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	fileState.command = "extension.describe";
	fileState.tooltip = "Refresh File Status";

	viewStatus.show();
	fileStatus.show();
	fileState.show();
}

export function hideStatusBar() {
	fileState.hide();
	fileStatus.hide();
	viewStatus.hide();
}

interface Progression {
	location: vscode.ProgressLocation.Notification;
	title: String;
	cancellable: boolean;
}


export function progressStatusBar(type: StatusBarItemType | undefined, progressText: string,
	callback?: (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, finish: () => void) => void,
	) {

	let restore: string;
	config.checkConfigForStatusBar(fileState, 'statusBarShowFileState');
	config.checkConfigForStatusBar(fileStatus, 'statusBarShowFileInfo');
	config.checkConfigForStatusBar(viewStatus, 'statusBarShowViewStatus');

	switch (type) {
		case StatusBarItemType.ViewStatus:
			restore = viewStatus.text;
			viewStatus.text = `$(repo-sync~spin) ` + progressText + '...';
			break;
		case StatusBarItemType.FileStatus:
			restore = fileStatus.text;
			fileStatus.text = `$(repo-sync~spin) ` + progressText + '...';
			break;
		case StatusBarItemType.FileState:
			restore = fileState.text;
			fileState.text = `$(repo-sync~spin) ` + progressText + '...';
			break;
		default:
			break;
	}

	//use restore with promose !keep your promises

	let progressOptions: vscode.ProgressOptions = {
		location: vscode.ProgressLocation.Notification,
		title: progressText,
		cancellable: false
	};

	if (callback) {
		vscode.window.withProgress(progressOptions, (progress, token) => {
			
			var p = new Promise(resolve => {
				callback(progress , resolve);
			});
			return p;
		});
	}
}


/*
if(finish){
	finish(p = new Promise<void>);
	return p;
}else{
	p = new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, 15000);
	});
	return p;
}
*/


export function showMessage(message: String, type: NotificationType) {
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
	LogCat.getInstance().log(`Result: ${message}`);
}

export function showOpenSettings(type: String) {
	vscode.window.showInformationMessage("" + type + " notification feedbacks for cleartool are not visible anymore. In case you change your mind , you can find parameters to change behaviour of extension in the settings section.", 'Understood', 'Go to Settings').then(selection => {
		if (selection) {
			if (selection === 'Go to Settings') {
				vscode.commands.executeCommand('workbench.action.openSettings', 'cleartool');
			}
		}
	});
}

export function setContextCriteria(state: FileState) {
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

export function showCommentDialog(callback: (val: string) => void) {
	if (vscode.workspace.getConfiguration("cleartool").get("actionCommentOptionDialog")) {
		vscode.window.showInputBox({
			prompt: "Type Comment to Check-Out File ",
			placeHolder: "Cannot be empty (see extension settings)"
		}).then(value => {
			if (value) {
				callback('-c ' + '"' + value + '"');
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

export async function showUncoQuickPick(callback: (val: string) => void) {
	let i = 0;
	const result = await vscode.window.showQuickPick(['Yes', 'No'], {
		placeHolder: 'Keep copy of your changes?'
	});

	switch (result) {
		case 'Yes':
			callback('-keep');
			break;
		default: case 'No':
			callback('-rm');
			break;
	}
}


export async function showInputBox() {
	const result = await vscode.window.showInputBox({
		value: 'abcdef',
		valueSelection: [2, 4],
		placeHolder: 'For example: fedcba. But not: 123',
		validateInput: text => {
			vscode.window.showInformationMessage(`Validating: ${text}`);
			return text === '123' ? 'Not 123!' : null;
		}
	});
	vscode.window.showInformationMessage(`Got: ${result}`);
}

