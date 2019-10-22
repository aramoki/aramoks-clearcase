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
	private date: Date;
	private outputChannel: vscode.OutputChannel;

	static getInstance(): LogCat {
		return (!LogCat.instance) ? LogCat.instance = new LogCat() : LogCat.instance;
	}

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel("Clearcase");
		this.date = new Date();
		this.log('LogCat initialiseed');
	}

	public log(message: string) {
		this.outputChannel.appendLine(this.date.toUTCString() + '\t' + `${message}`);
	}

}