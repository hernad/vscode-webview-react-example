import { ExtensionContext, commands, window, extensions, workspace } from 'vscode';
import { Global } from './global';
import { F18Panel } from './f18Panel';
import { PostgresConnection } from './postgresConnection';
import { IConnection } from './IConnection';

export function activate(context: ExtensionContext) {
	console.log('F18 ekstenzija aktivna :)');

	Global.context = context;

	context.subscriptions.push(
		commands.registerCommand('f18.start.cmd', () => {
			F18Panel.createF18Instance('cmd');
		})
	)

	const postgresExtension = extensions.getExtension('bringout.postgres');
	if (postgresExtension == undefined) { 
		window.showErrorMessage('Instalirati bringout.postgres !');
		return;
    };

	postgresExtension.activate().then(() => {
		const postgresApi = postgresExtension.exports;
		// console.log( `postgresql API: ${importedApi.sum(1, 1)} ${importedApi.context()}`);
		Global.contextPostgres = postgresApi.context();
		
		return(1);
	}).then((result)=>{

		// console.log(`step ${result}`);
		PostgresConnection.getDefaultConnection().then((connection: IConnection) => {
			// console.log(connection.database);
			
			context.subscriptions.push(
				commands.registerCommand('f18.selectDatabase',
					() => commands.executeCommand('postgres.selectDatabase').then(() => console.log('selected database'))
				),
				commands.registerCommand('f18.start.pos', () => {
					F18Panel.createF18Instance('pos');
				}),
				commands.registerCommand('f18.start.fin', () => {
					F18Panel.createF18Instance('fin');
				}),
				commands.registerCommand('f18.start.kalk', () => {
					F18Panel.createF18Instance('kalk');
				}),
				commands.registerCommand('f18.start.fakt', () => {
					F18Panel.createF18Instance('fakt');
				}),
				commands.registerCommand('f18.start.os', () => {
					F18Panel.createF18Instance('os');
				}),
				commands.registerCommand('f18.start.ld', () => {
					F18Panel.createF18Instance('ld');
				}),
				commands.registerCommand('f18.start.epdv', () => {
					F18Panel.createF18Instance('epdv');
				})
			);
		});
	});


	const fullScreen = workspace.getConfiguration('f18').get('fullScreen');

	if (fullScreen) commands.executeCommand('workbench.action.toggleFullScreen');

	commands.executeCommand('workbench.action.closeAllEditors');

	// activity bar always visible
	if (!workspace.getConfiguration('workbench').get('activityBar.visible'))
		commands.executeCommand('workbench.action.toggleActivityBarVisibility');

	// const visibleSideBar = vscode.workspace.getConfiguration('workbench').get('sideBar.location');
	// vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');

	setTimeout(() => {
		const onStart: string = workspace.getConfiguration('f18').get('onStart');
		if (onStart.trim() !== '')
			commands.executeCommand(`f18.start.${onStart}`);
	}, 1000);
}

