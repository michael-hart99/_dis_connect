var path = require('path');

module.exports = {
  mode: 'production',
  module: {
    rules: [
      {
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  entry: {
    controller:   './website/controller/script.ts',
    preshowvideo: './website/preshowvideo/script.ts',
    projector:    './website/projector/script.ts',
    streamHost:   './website/streamHost/script.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  }
};
