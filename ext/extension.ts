import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('f18.start.pos', () => {
		F18Panel.createOrShow(context.extensionPath, 'pos', 'proba_2018');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('f18.start.fin', () => {
		F18Panel.createOrShow(context.extensionPath, 'fin', 'proba_2018');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('f18.start.kalk', () => {
		F18Panel.createOrShow(context.extensionPath, 'kalk', 'proba_2018');
	}));

}


class F18Panel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: F18Panel | undefined;

	public static createOrShow(extensionPath: string, cModul: string, cOrganizacija: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

			F18Panel.currentPanel = new F18Panel(cModul, cOrganizacija, extensionPath, column || vscode.ViewColumn.One);

	}

	private static readonly viewType = 'F18';
	private static panelNum = 1;

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionPath: string;
	private disposables: vscode.Disposable[] = [];
	private terminal: vscode.Terminal;
	private readonly modul: string;
	private readonly f18Organizacija: string;


	private constructor(cModul: string, cOrganizacija: string, extensionPath: string, column: vscode.ViewColumn) {
		this.extensionPath = extensionPath;

		this.modul = cModul;
		this.f18Organizacija = cOrganizacija;

		const currentPanelCaption = `F18 ${this.modul} - ${F18Panel.panelNum}`;
		F18Panel.panelNum++;

		this.terminal = vscode.window.createTerminal(currentPanelCaption);
		

		(this.terminal as any).onDidWriteData((data: string) => {
			// console.log('onDidWriteData: ' + data);
			this.doTerminalWrite(data); 
		});

		this.terminal.show(true);
		this.terminal.hide();
		// this.terminal.sendText("stty cols 100 rows 40 ; cd /home/hernad/F18_knowhow ; ./F18.sh ");
		this.terminal.sendText(`stty cols 120 rows 40 ; cd /home/hernad/F18_knowhow ; ./F18.sh -h 127.0.0.1 -y 5432 -u hernad -p hernad -d ${this.f18Organizacija} --${this.modul} ; exit`);

		
		vscode.window.onDidCloseTerminal( (terminal: vscode.Terminal) => {
			// vscode.window.showInformationMessage(`onDidCloseTerminal, name: ${terminal.name}`);
			if ( terminal.name == this.terminal.name ) {
				this.panel.dispose();
			}
		});


		this.panel = vscode.window.createWebviewPanel(F18Panel.viewType, currentPanelCaption, column, {
			// Enable javascript in the webview
			enableScripts: true,
			retainContextWhenHidden: true,
			
			// And restric the webview to only loading content from our extension's `media` directory.
			localResourceRoots: [
				vscode.Uri.file(path.join(this.extensionPath, 'build'))
			],
			
		});

	
		// Set the webview's initial html content 
		this.panel.webview.html = this._getHtmlForWebview();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.data);
					return;
				case 'terminal-input':
					this.terminal.sendText(message.data, false);
					// console.log(`terminal-input: ${message.data}`);
				    
			}
		}, null, this.disposables);

		
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this.panel.webview.postMessage({ command: 'refactor' });
	}

	public doTerminalWrite( data: string ) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this.panel.webview.postMessage({ command: 'terminal', data });
	}

	public dispose() {
		F18Panel.currentPanel = undefined;
		this.terminal.dispose();

		// Clean up our resources
		this.panel.dispose();

		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview() {
		// const manifest = require(path.join(this.extensionPath, 'out', 'asset-manifest.json'));
		// const mainScript = 'index.js';
		// const mainStyle = 'index.css';

		// app.5793fd45.js   app.5793fd45.map
		const mainScript = 'dist/bundle.js';

		const xtermStyle = 'node_modules/xterm/dist/xterm.css';
		const mainStyle = 'index.css';

		const reactScript1 = 'node_modules/react/umd/react.development.js';
		const reactScript2 = 'node_modules/react-dom/umd/react-dom.development.js';


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

		const stylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, '.', mainStyle));
		const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

		
		// Use a nonce to whitelist which scripts can bereact.development.js run
		const nonce = getNonce();

		const strHtml = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>React App</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<link rel="stylesheet" type="text/css" href="${xtermStyleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src http://localhost:5000 https://w5xlvm3vzz.lp.gql.zone/graphql; img-src vscode-resource: https: http:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(path.join(this.extensionPath, '.')).with({ scheme: 'vscode-resource' })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<div id="example"></div>
				<script nonce="${nonce}" src="${scriptReact1Uri}"></script>
				<script nonce="${nonce}" src="${scriptReact2Uri}"></script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
		console.log(strHtml);
		return strHtml;
	}
}

function getNonce() {
	let text = "";
	const possible = "AF18DEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012ea890";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}