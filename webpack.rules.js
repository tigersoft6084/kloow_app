module.exports = [
  {
    test: /native_modules[/\\].+\.node$/,
    use: "node-loader",
  },
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: "@vercel/webpack-asset-relocator-loader",
      options: {
        outputAssetBase: "native_modules",
      },
    },
  },
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-react"],
      },
    },
  },
  {
    test: /\.css$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }],
  },
  {
    test: /\.html$/,
    use: [{ loader: "html-loader" }],
  },
  {
    test: /\.(png|jpg|jpeg|gif|svg)$/,
    use: [{ loader: "file-loader" }],
  },
];
