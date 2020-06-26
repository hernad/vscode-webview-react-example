'use strict';
import * as vscode from 'vscode';
export class Constants {
  public static PostgresExtensionId = 'postgres';
  public static PostgresGlobalStateKey = 'postgresql.connections';
}



const revisionS = '4.22.58';
const execHashListS: any = {
  'linux-x64': '087bf6069ee42b6d4f9373dfa97127dc',
  'windows-x64': '213a8721ffb2ec9d8ba7fb5d5034e0f3',
  'windows-x86': '64159523474d5d459db855a0aaa0f5ad'
};


const revisionE = '4.22.57';
const execHashListE: any = {
  'linux-x64': 'd86b86f8579541f5e486fdc48f0b6604',
  'windows-x64': '173ccf0dc6bedb567f03dc52341634f2',
  'windows-x86': 'c1f07f06cbdd497ae4c68a7dc4ab4236'
};


const revisionX = '4.22.54';
const execHashListX: any = {
  'linux-x64': 'c78ba866980fd1b06783395444dd4959',
  'windows-x64': 'f323249688a560aaec816372c16c600a',
  'windows-x86': 'adb7667247a5c498567576af3b2fb42a'
};


const execHashListAll: any = {
   'S': execHashListS,
   'E': execHashListE,
   'X': execHashListX
};

const revisionAll: any = {
  'S': revisionS,
  'E': revisionE,
  'X': revisionX
}

const versionChannel: string = vscode.workspace.getConfiguration('f18').get('verChannel');

export const revision = revisionAll[versionChannel];
export const execHashList = execHashListAll[versionChannel];