'use strict';
import * as vscode from 'vscode';

//todo:loglevel

enum LogLevel {
	Verbose,
	Debug,
	Warning,
	Error,
	Info,
	None
}

export class LogCat {
	private static instance: LogCat;
	private outputChannel: vscode.OutputChannel;

	static getInstance(): LogCat {
		return (!LogCat.instance) ? LogCat.instance = new LogCat() : LogCat.instance;
	}

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel("Clearcase");
		this.log('LogCat initialiseed');
	}

	public log(message: string) {
		this.outputChannel.appendLine(`${message}`);
	}

}