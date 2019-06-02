var path = require('path');

module.exports = {
  mode: 'production',
  module: {
    rules: [
      {
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig_web.jsonnet',
          compilerOptions: {
            "removeComments": true,
            "noEmit": false
          }
        }
      }
    ]
  },
  entry: {
    controller:   './website/controller/script.ts',
    preshowvideo: './website/preshowvideo/script.ts',
    projector:    './website/projector/script.ts',
    streamHost:   './website/streamHost/script.ts'
  },
  resolve: {
   extensions: ['.js', '.ts']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  }
};
