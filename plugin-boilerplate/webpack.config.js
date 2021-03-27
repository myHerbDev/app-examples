const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const localtunnel = require('localtunnel')

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction
const tunnelSubdomain = 'miro-plugin-boilerplate'

const entries = {
  index: './src/index.ts',
  app: './src/app.tsx',
}

/*
 * This is a custom plugin that uses localtunnel to create a `https` tunnel
 * to allow you to use this URL while you are developing locally
 */
class LocalTunnelPlugin {
  PLUGIN_NAME = 'LocalTunnel'

  tunnelCreated = false

  defaultOptions = {
    subdomain: tunnelSubdomain,
  }

  constructor(options = {}) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    }
  }

  apply = (compiler) => {
    if (!compiler.options.devServer) return

    const logger = compiler.getInfrastructureLogger(this.PLUGIN_NAME)

    compiler.hooks.assetEmitted.tap(this.PLUGIN_NAME, async () => {
      if (!this.tunnelCreated) {
        this.tunnelCreated = true
        try {
          const tunnel = await localtunnel({
            ...this.options,
            port: compiler.options.devServer.port,
          })

          logger.info(`tunnel created: ${tunnel.url}`)
        } catch (e) {
          this.tunnelCreated = false
          logger.error('can not create tunnel', e)
        }
      }
    })
  }
}

module.exports = {
  mode: isProduction ? 'production' : 'development',
  bail: isProduction,
  target: isDevelopment ? 'web' : 'browserslist',
  devServer: {
    disableHostCheck: true,
    compress: true,
    contentBase: path.join(__dirname, 'dist'),
    port: 9000,
    headers: {
      'Bypass-Tunnel-Reminder': true,
    },
    public: `${tunnelSubdomain}.loca.lt`,
  },
  entry: entries,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.css'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.svg/,
        type: 'asset/source',
      },
    ],
  },
  plugins: [
    new LocalTunnelPlugin(),
    ...Object.keys(entries).map((entry) => {
      const sharedHtmlSettings = {
        chunks: [entry],
        inject: 'body',
        meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'},
        template: `./src/${entry}.html`,
      }

      return new HtmlWebpackPlugin({...sharedHtmlSettings, ...(entry === 'index' ? {} : {filename: `${entry}.html`})})
    }),
  ],
}
