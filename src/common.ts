'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { LogCat } from './logcat';

export function fetchRealLocation(path: fs.PathLike): Promise<string> {
	return new Promise((resolve, reject) => {
		let realFile: string;
		fs.lstat(path, function (err, stats) {
			if (err) {
				reject(err);
			}
			if (stats.isSymbolicLink()) {
				fs.readlink(path, (err: NodeJS.ErrnoException | null, linkstring: string) => {
					resolve('"' + linkstring + '"');
				});
			} else {
				//ui.fileState.text = pre;
				resolve('"' + path.toString() + '"');
			}
		});

	});
}

export function datePriorToNow(date: Date | RegExpMatchArray | null): string {
	if (date) {
		if(date instanceof Date){
			let dateTime: number = ((new Date()).valueOf() - date.valueOf());
			var msPerMinute = 60 * 1000;
			var msPerHour = msPerMinute * 60;
			var msPerDay = msPerHour * 24;
			var msPerMonth = msPerDay * 30;
			var msPerYear = msPerDay * 365;
			if (dateTime < msPerMinute) {
				return ' ' + Math.round(dateTime / 1000) + ' seconds ago';
			} else if (dateTime < msPerHour) {
				return ' ' + Math.round(dateTime / msPerMinute) + ' minutes ago';
			} else if (dateTime < msPerDay) {
				return ' ' + Math.round(dateTime / msPerHour) + ' hours ago';
			} else if (dateTime < msPerMonth) {
				return ' ~' + Math.round(dateTime / msPerDay) + ' days ago';
			} else if (dateTime < msPerYear) {
				return ' ~' + Math.round(dateTime / msPerMonth) + ' months ago';
			} else {
				return ' ~' + Math.round(dateTime / msPerYear) + ' years ago';
			}
		}else{
			return datePriorToNow(new Date(date[0].toString()));
		}
	} else {
		return ' - ';
	}
}