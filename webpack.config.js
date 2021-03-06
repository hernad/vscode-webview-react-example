//@ts-check
'use strict';

//const webpack = require('webpack'); 
const path = require('path');
//const nodeExternals = require('webpack-node-externals');
//const IgnoreEmitPlugin = require('ignore-emit-webpack-plugin');
//const IgnoreNotFoundExportPlugin = require('ignore-not-found-export-webpack-plugin');
 
 

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: './ext/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  /*
  plugins: [
    new webpack.IgnorePlugin(/pg-native/)
  ],
  */
  devtool: 'source-map',
  /*
  externals: {
    vscode: 'commonjs vscode', // node-pty keytar yauzl' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    'node-pty',
    'keytar',
    'yauzl'
  },
  */
  /*externals: [nodeExternals()],*/
  externals: {
         "pg-native": {
            commonjs: 'pg-native',
            commonjs2: 'pg-native'
         },
         "vscode": {
           commonjs: 'vscode',
           commonjs2: 'vscode'
         },
         //"node-pty": {
         //   commonjs: 'node-pty',
         //   commonjs2: 'node-pty'
         // },
          //"keytar": {
          //  commonjs: 'keytar',
          //  commonjs2: 'keytar'
          //},
          //"yauzl": {
          //  common: 'yauzl',
          //  commonjs2: 'yauzl'
          //},
          //"https-proxy-agent": {
          //  common: 'https-proxy-agent',
          //  commonjs2: 'https-proxy-agent'
          //}
   },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
                //compilerOptions: {
                //    "module": "es6" // override `tsconfig.json` so that TypeScript emits native JavaScript modules.
                //}
            }
          }

        ]
      }
    ]
  }
};
module.exports = config;