const path = require('path')

module.exports = (env, argv) => ({
  target: 'node',
  entry: './src/index.ts',
  context: __dirname,
  mode: argv.mode || 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, 'tsconfig.json'),
          transpileOnly: false,
        },
      },
    ],
  },
  externals: [
    /^@angular\//,
    /^@ng-bootstrap\//,
    /^rxjs(\/|$)/,
    /^tabby-/,
    'fs',
    'fs/promises',
    'path',
    'os',
    'crypto',
    'util',
    'stream',
    'buffer',
  ],
  performance: {
    hints: false,
  },
})
