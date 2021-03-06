/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// https://github.com/GoogleChrome/puppeteer/blob/master/lib/helper.js

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { TimeoutError } = require('./errors');

//const debugError = require('debug')(`puppeteer:error`);

/** @type {?Map<string, boolean>} */
let apiCoverage: any = null;


export class Helper {
	/**
   * @param {Function|string} fun
   * @param {!Array<*>} args
   * @return {string}
   */
	static evaluationString(fun: any, ...args: any[]): string {
		if (Helper.isString(fun)) {
			assert(args.length === 0, 'Cannot evaluate a string with arguments');
			return /** @type {string} */ fun;
		}
		return `(${fun})(${args.map(serializeArgument).join(',')})`;

		/**
     * @param {*} arg
     * @return {string}
     */
		function serializeArgument(arg: any) {
			if (Object.is(arg, undefined)) return 'undefined';
			return JSON.stringify(arg);
		}
	}

	/**
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @return {string}
   */
	static getExceptionMessage(exceptionDetails: any) {
		if (exceptionDetails.exception)
			return exceptionDetails.exception.description || exceptionDetails.exception.value;
		let message = exceptionDetails.text;
		if (exceptionDetails.stackTrace) {
			for (const callframe of exceptionDetails.stackTrace.callFrames) {
				const location = callframe.url + ':' + callframe.lineNumber + ':' + callframe.columnNumber;
				const functionName = callframe.functionName || '<anonymous>';
				message += `\n    at ${functionName} (${location})`;
			}
		}
		return message;
	}

	/**
   * @param {!Protocol.Runtime.RemoteObject} remoteObject
   * @return {*}
   */
	static valueFromRemoteObject(remoteObject: any) {
		assert(!remoteObject.objectId, 'Cannot extract value when objectId is given');
		if (remoteObject.unserializableValue) {
			switch (remoteObject.unserializableValue) {
				case '-0':
					return -0;
				case 'NaN':
					return NaN;
				case 'Infinity':
					return Infinity;
				case '-Infinity':
					return -Infinity;
				default:
					throw new Error('Unsupported unserializable value: ' + remoteObject.unserializableValue);
			}
		}
		return remoteObject.value;
	}

	/**
   * @param {!Puppeteer.CDPSession} client
   * @param {!Protocol.Runtime.RemoteObject} remoteObject
   */
	static async releaseObject(client: any, remoteObject: any) {
		if (!remoteObject.objectId) return;
		await client.send('Runtime.releaseObject', { objectId: remoteObject.objectId }).catch((error: any) => {
			// Exceptions might happen in case of a page been navigated or closed.
			// Swallow these since they are harmless and we don't leak anything in this case.
			//debugError(error);
		});
	}


	/**
	* @param {!NodeJS.EventEmitter} emitter
	* @param {(string|symbol)} eventName
	* @param {function(?):void} handler
	* @return {{emitter: !NodeJS.EventEmitter, eventName: (string|symbol), handler: function(?)}}
	*/
	static addEventListener(emitter: any, eventName: any, handler: any) {
		emitter.on(eventName, handler);
		return { emitter, eventName, handler };
	}

	/**
   * @param {!Array<{emitter: !NodeJS.EventEmitter, eventName: (string|symbol), handler: function(?):void}>} listeners
   */
	static removeEventListeners(listeners: any) {
		for (const listener of listeners) listener.emitter.removeListener(listener.eventName, listener.handler);
		listeners.splice(0, listeners.length);
	}

	/**
   * @return {?Map<string, boolean>}
   */
	static publicAPICoverage() {
		return apiCoverage;
	}

	static recordPublicAPICoverage() {
		apiCoverage = new Map();
	}

	/**
   * @param {!Object} obj
   * @return {boolean}
   */
	static isString(obj: any) {
		return typeof obj === 'string' || obj instanceof String;
	}

	/**
   * @param {!Object} obj
   * @return {boolean}
   */
	static isNumber(obj: any) {
		return typeof obj === 'number' || obj instanceof Number;
	}

	static promisify(nodeFunction: any) {
		function promisified(...args: any[]) {
			return new Promise((resolve, reject) => {
				function callback(err: any, ...result: any[]) {
					if (err) return reject(err);
					if (result.length === 1) return resolve(result[0]);
					return resolve(result);
				}
				nodeFunction.call(null, ...args, callback);
			});
		}
		return promisified;
	}


	/*
	static promisify(api: any) {
		return function(...args) {
			return new Promise(function(resolve, reject) {
				api(...args, function(err, response) {
					if (err) return reject(err);
					resolve(response);
				});
			});
		};
	}
	*/

	/**
   * @param {!NodeJS.EventEmitter} emitter
   * @param {(string|symbol)} eventName
   * @param {function} predicate
   * @return {!Promise}
   */
	static waitForEvent(emitter: any, eventName: any, predicate: any, timeout: any) {
		let eventTimeout: any, resolveCallback: any, rejectCallback: any;
		const promise = new Promise((resolve, reject) => {
			resolveCallback = resolve;
			rejectCallback = reject;
		});
		const listener = Helper.addEventListener(emitter, eventName, (event: any) => {
			if (!predicate(event)) return;
			cleanup();
			resolveCallback(event);
		});
		if (timeout) {
			eventTimeout = setTimeout(() => {
				cleanup();
				rejectCallback(new TimeoutError('Timeout exceeded while waiting for event'));
			}, timeout);
		}
		function cleanup() {
			Helper.removeEventListeners([listener]);
			clearTimeout(eventTimeout);
		}
		return promise;
	}

	/**
   * @template T
   * @param {!Promise<T>} promise
   * @param {string} taskName
   * @param {number} timeout
   * @return {!Promise<T>}
   */
	static async waitWithTimeout(promise: any, taskName: any, timeout: number) {
		let reject: any;
		const timeoutError = new TimeoutError(`waiting for ${taskName} failed: timeout ${timeout}ms exceeded`);
		const timeoutPromise = new Promise((resolve, x) => (reject = x));
		const timeoutTimer = setTimeout(() => reject(timeoutError), timeout);
		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			clearTimeout(timeoutTimer);
		}
	}

	static mkdirp(dir: string, cb: any) {
		if (dir === '.') return cb();
		fs.stat(dir, function (err) {
			if (err == null) return cb(); // already exists

			var parent = path.dirname(dir);
			Helper.mkdirp(parent, function () {
				process.stdout.write(dir.replace(/\/$/, '') + '/\n');
				fs.mkdir(dir, cb);
			});
		});
	}

	static is_windows() {
		return process.platform === 'win32';
	}

	static os_platform(): string {
		let platform: string = os.platform();

		if (platform === 'darwin') platform = 'mac';
		else if (platform === 'linux')
			platform = (os.arch() === 'x64') ? 'linux-x64' : 'linux-x86';
		else if (platform === 'win32')
			platform = (os.arch() === 'x64') ? 'windows-x64' : 'windows-x86';
		else
			assert(platform, 'Unsupported platform: ' + os.platform());

		return platform;
	}

	static nfcall(fn: Function, ...args: any[]): Promise<any>;
	static nfcall<T>(fn: Function, ...args: any[]): Promise<T>;
	static nfcall(fn: Function, ...args: any[]): any {
		return new Promise((c, e) => fn(...args, (err: any, result: any) => err ? e(err) : c(result)));
	}

	static stat(path: string): Promise<fs.Stats> {
		return Helper.nfcall(fs.stat, path);
	}

	static fileExists(path: string): Promise<boolean> {
		return Helper.stat(path).then(stat => stat.isFile(), () => false);
	}

	static readFile(path: string): Promise<Buffer>;
	static readFile(path: string, encoding: string): Promise<string>;
	static readFile(path: string, encoding?: string): Promise<Buffer | string> {
		return Helper.nfcall(fs.readFile, path, encoding);
	}

	static linux_distribution(): Promise<string> {

		//if (os.platform() === 'linux') {
		const file = '/etc/os-release';

		return Helper.fileExists(file).then( (exists) => {
			if (!exists) {
				return 'distrib-error0';
			}
			return Promise.resolve(
				Helper.readFile(file)
					.then(b => {
						const contents = b.toString();
						if (/NAME="?Fedora"?/.test(contents)) {
							return 'Fedora';
						} else if (/NAME="?Ubuntu"?/.test(contents)) {
							return 'Ubuntu';
						}
						return 'unknown-distribution';
					}, () => "distrib-error1"))

		}, () => "distrib-error2");


	}

}

export function assert(value: any, message: string) {
	if (!value) throw new Error(message);
}
