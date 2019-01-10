import * as path from 'path';
import * as vscode from 'vscode';

const LINE_HEIGHT = 0.92;
const LETTER_SPACING = 0;
const RENDERER_TYPE = 'canvas';  // 'dom' | 'canvas'

const DEFAULT_WINDOWS_FONT_FAMILY = 'Consolas, \'Courier New\', monospace';
// const DEFAULT_MAC_FONT_FAMILY = 'Menlo, Monaco, \'Courier New\', monospace';
const DEFAULT_LINUX_FONT_FAMILY = '\'Droid Sans Mono\', \'monospace\', monospace, \'Droid Sans Fallback\'';


// /home/hernad/vscode/src/vs/editor/common/config/commonEditorConfig.ts

// EDITOR_FONT_DEFAULTS.fontFamily

export function activate(context: vscode.ExtensionContext) {
	console.log('F18 ekstenzija aktivna :)');

	context.subscriptions.push(
		vscode.commands.registerCommand('f18.start.pos', () => {
			F18Panel.create(context.extensionPath, 'pos', 'proba_2018');
		}),
		vscode.commands.registerCommand('f18.start.fin', () => {
			F18Panel.create(context.extensionPath, 'fin', 'proba_2018');
		}),
		vscode.commands.registerCommand('f18.start.kalk', () => {
			F18Panel.create(context.extensionPath, 'kalk', 'proba_2018');
		})
	);

	const fullScreen = vscode.workspace.getConfiguration('f18').get('fullScreen');

	//NEVER_MEASURE_RENDER_TIME_STORAGE_KEY = 'terminal.integrated.neverMeasureRenderTime'

	if (fullScreen) vscode.commands.executeCommand('workbench.action.toggleFullScreen');

	vscode.commands.executeCommand('workbench.action.closeAllEditors');

	// activity bar always visible
	if (!vscode.workspace.getConfiguration('workbench').get('activityBar.visible'))
		vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');

	// const visibleSideBar = vscode.workspace.getConfiguration('workbench').get('sideBar.location');
	// vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');

	setTimeout(() => {
		const onStart = vscode.workspace.getConfiguration('f18').get('onStart');
		vscode.commands.executeCommand(`f18.start.${onStart}`);
	}, 1000);
}

class F18Panel {

	public static currentPanel: F18Panel | undefined;

	public static create(extensionPath: string, cModul: string, cOrganizacija: string) {
		// const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
		const column = undefined;

		F18Panel.currentPanel = new F18Panel(cModul, cOrganizacija, extensionPath, column || vscode.ViewColumn.One);
	}

	private static readonly viewType = 'F18';
	private static panelNum = 1;

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionPath: string;
	// private disposables: vscode.Disposable[] = [];

	private terminal: vscode.Terminal;
	private readonly modul: string;
	private readonly f18Organizacija: string;
	private readonly panelNum: number;
	private cols: number;
	private rows: number;
	private width: number;
	private height: number;
	private fontFamily: string;
	private fontSize: number;

	private constructor(cModul: string, cOrganizacija: string, extensionPath: string, column: vscode.ViewColumn) {
		this.extensionPath = extensionPath;

		this.modul = cModul;
		this.f18Organizacija = cOrganizacija;
		this.cols = 120;
		this.rows = 40;
		this.width = 0;
		this.height = 0;
		this.fontSize = 16;


		const tmpFS = vscode.workspace.getConfiguration('f18').get('fontSize');
		if (tmpFS !== undefined) {
			this.fontSize = tmpFS as number;
			// vscode.window.showErrorMessage(`fontsize: ${this.fontSize}`);
		}

		this.fontFamily = is_windows() ? DEFAULT_WINDOWS_FONT_FAMILY : DEFAULT_LINUX_FONT_FAMILY;
		const tmpFF = vscode.workspace.getConfiguration('editor').get('fontFamily');
		tmpFF !== undefined ? this.fontFamily = tmpFF as string : vscode.window.showErrorMessage('config editor.fontFamily?!');

		this.panelNum = F18Panel.panelNum;
		const currentPanelCaption = `F18 ${this.modul} - ${this.panelNum}`;
		F18Panel.panelNum++;

		this.panel = vscode.window.createWebviewPanel(
			F18Panel.viewType,
			currentPanelCaption,
			{ viewColumn: column, preserveFocus: false },
			{
				enableScripts: true, // Enable javascript in the webview
				retainContextWhenHidden: true,

				// And restric the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [
					vscode.Uri.file(path.join(this.extensionPath, 'cli')),
					vscode.Uri.file(path.join(this.extensionPath, 'build'))
				]
			}
		);
		this.panel.webview.html = this._getHtmlForWebview();

		this.terminal = vscode.window.createTerminal(currentPanelCaption, shell());
		this.terminal.processId.then(
			(processId) => {
				// vscode.window.showInformationMessage( `kreiran terminal ${processId}`);
				this.configureTerminal();
			},
			() => vscode.window.showErrorMessage('terminal se ne može kreirati?!')
		);
	}

	public configureTerminal() {
		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this.panel.onDidDispose(() => this.dispose());

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage((message: any) => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.data);
					break;

				case 'cli-dimensions':
					this.computeDimensions(message.data);

				case 'cli-focus':
					// if (this.terminal) this.terminal.sendText(message.data);
					// @ts-ignore
					this.terminal.resize(this.cols, this.rows);
					// vscode.window.showInformationMessage(`cli-focus: resize ${this.cols} x ${this.rows}`);
					break;

				case 'cli-input':
					if (this.terminal) {
						// @ts-ignore
						this.terminal.sendText(message.data, false);
					}
				// console.log(`cli-input: ${message.data}`);
			}
		});

		const config = vscode.workspace.getConfiguration('f18'); //.get('fullScreen');
		const configMerged = { ...config, rendererType: RENDERER_TYPE, fontFamily: this.fontFamily, letterSpacing: LETTER_SPACING, lineHeight: LINE_HEIGHT }

		this.panel.webview.postMessage({
			command: 'term-get-dimensions',
			data: JSON.stringify(configMerged)
		});
	}

	public computeDimensions(msg_data: string) {

		const dims = JSON.parse(msg_data);
		this.width = dims.width;
		this.height = dims.height;

		this.rows = dims.rows;
		this.cols = dims.cols;
		// vscode.window.showInformationMessage(`rows: ${this.rows}, cols: ${this.cols}`);

		this.setupTerminal();
	}

	public setupTerminal() {
		(this.terminal as any).onDidWriteData((data: string) => {
			// console.log('onDidWriteData: ' + data);
			this.doTerminalWrite(data);
		});

		// kad nema this.terminal.show [uncaught exception]: TypeError: Cannot read property 'classList' of undefined
		this.terminal.show(true);
		// @ts-ignore
		this.terminal.resize(this.cols, this.rows);
		this.terminal.hide();

		let sendInitCmds: string;

		if (is_windows()) {
			sendInitCmds = `mode con: cols=${this.cols} lines=${this.rows}`;
			sendInitCmds += '& cls';
			sendInitCmds += `& cd ${this.extensionPath}\\win32`;
			sendInitCmds += `& F18.exe 2>${this.modul}_${this.panelNum}.log -h 192.168.124.1 -y 5432 -u hernad -p hernad -d ${this.f18Organizacija} --${this.modul}`
			sendInitCmds += '& exit';
		} else {
			sendInitCmds = `stty cols ${this.cols} rows ${this.rows}`;
			sendInitCmds += `; reset`;
			sendInitCmds += `; cd ${this.extensionPath}/linux`;
			sendInitCmds += `; ./F18 2>${this.modul}_${this.panelNum}.log -h 192.168.124.1 -y 5432 -u hernad -p hernad -d ${this.f18Organizacija} --${this.modul}`;
			sendInitCmds += '; exit';
		}

		vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
			// vscode.window.showInformationMessage(`onDidCloseTerminal, name: ${terminal.name}`);
			if (this.terminal && terminal.name == this.terminal.name) {
				this.panel.dispose();
			}
		});

		const termOptions = {
			cols: this.cols,
			rows: this.rows,
			cursorBlink: true,
			bellStyle: 'sound',
			cursorStyle: 'block',
			// cursorStyle: 'underline',
			// cursorStyle: 'bar',
			// rendererType: 'canvas',
			rendererType: RENDERER_TYPE,
			experimentalCharAtlas: 'dynamic',
			fontFamily: this.fontFamily,

			//fontSize: 12,
			//letterSpacing: 0,
			//lineHeight: 0.99
			fontSize: this.fontSize,
			letterSpacing: LETTER_SPACING,
			lineHeight: LINE_HEIGHT,
			termName: `F18 ${this.modul} - ${this.panelNum}`
		};
		this.panel.webview.postMessage({ command: 'term-create', data: JSON.stringify(termOptions) });

		this.terminal.sendText(sendInitCmds);
	}

	public dispose() {
		F18Panel.currentPanel = undefined;
		if (this.terminal) this.terminal.dispose();

		// Clean up our resources
		this.panel.dispose();

		// while (this.disposables.length) {
		// 	const x = this.disposables.pop();
		// 	if (x) {
		// 		x.dispose();
		// 	}
		// }
	}

	public doTerminalWrite(data: string) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this.panel.webview.postMessage({ command: 'term-write', data });
	}

	private _getHtmlForWebview() {
		// const manifest = require(path.join(this.extensionPath, 'out', 'asset-manifest.json'));
		// const mainScript = 'index.js';
		// const mainStyle = 'index.css';

		const mainScript = 'dist/bundle.js';

		const xtermStyle = 'node_modules/vscode-xterm/lib/xterm.css';
		// const xtermFullScreenStyle = 'node_modules/xterm/dist/addons/fullscreen/fullscreen.css';
		const mainStyle = 'index.css';

		// const mode = 'development';
		const mode = 'production.min';

		const reactScript1 = `node_modules/react/umd/react.${mode}.js`;
		const reactScript2 = `node_modules/react-dom/umd/react-dom.${mode}.js`;

		//<script src="./node_modules/react/umd/react.development.js"></script>
		//<script src="./node_modules/react-dom/umd/react-dom.development.js"></script>

		const scriptPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'build', mainScript));
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });

		const scriptReact1OnDisk = vscode.Uri.file(path.join(this.extensionPath, 'cli', reactScript1));
		const scriptReact1Uri = scriptReact1OnDisk.with({ scheme: 'vscode-resource' });

		const scriptReact2OnDisk = vscode.Uri.file(path.join(this.extensionPath, 'cli', reactScript2));
		const scriptReact2Uri = scriptReact2OnDisk.with({ scheme: 'vscode-resource' });

		const xermStylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'cli', xtermStyle));
		const xtermStyleUri = xermStylePathOnDisk.with({ scheme: 'vscode-resource' });

		// const xermFullScreenStylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'cli', xtermFullScreenStyle));
		// const xtermFullScreenStyleUri = xermFullScreenStylePathOnDisk.with({ scheme: 'vscode-resource' });

		const stylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'cli', mainStyle));
		const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

		// Use a nonce to whitelist which scripts can bereact.development.js run
		const nonce = getNonce();

		const strHtml = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>F18 screen</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<link rel="stylesheet" type="text/css" href="${xtermStyleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src http://localhost:5000 https://w5xlvm3vzz.lp.gql.zone/graphql; img-src vscode-resource: https: http:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(this.extensionPath).with({ scheme: 'vscode-resource' })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<script nonce="${nonce}" src="${scriptReact1Uri}"></script>
				<script nonce="${nonce}" src="${scriptReact2Uri}"></script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
		// console.log(strHtml);
		return strHtml;
	}
}

function getNonce() {
	let text = '';
	const possible = 'AF18DEFGHIJK3-XQvabcdefghijklmnopqrstuvwxyz012ea890';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function is_windows() {
	return process.platform === 'win32';
}

function shell() {
	if (is_windows()) {
		return 'cmd.exe';
	} else {
		return '/bin/bash';
	}
}
