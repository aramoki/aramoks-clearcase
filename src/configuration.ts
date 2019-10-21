'use strict';
import * as vscode from 'vscode';

export function checkConfigForStatusBar(item: vscode.StatusBarItem, config: string) {
	if (vscode.workspace.getConfiguration('cleartool').get(config)) {
		item.show();
	} else {
		item.hide();
	}
}
