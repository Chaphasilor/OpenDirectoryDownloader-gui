const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    tailwind: `./src/tailwind.js`,
    index: `./src/index.js`,
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'static/webpack'),
  },
  devtool: 'eval',
  plugins: [
    new CleanWebpackPlugin(),
    new BrowserSyncPlugin({
      ui: {
        port: 3001
      },
      files: [
        `./static/**/*.*`,
        // `./static/**/*.js`,
        // `./static/**/*.html`,
      ],
      watchEvents: [
        `change`,
        `add`,
        `unlink`, // delete
        `addDir`,
        `unlinkDir`,
      ],
      server: {
        baseDir: `static`,
        directory: false,
      },
      injectChanges: true,
      proxy: false, // in case another server should be used with browser-sync
      port: 3000,
      browser: `default`,
      cors: true,
      notify: false, // disable browser-sync popup on reload
      minify: true,
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                ident: 'postcss',
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                  require('cssnano')({
                    preset: `default`,
                  }),
                ],
              },
            }
          },
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader',
        ],
      },
    ]
  }
}