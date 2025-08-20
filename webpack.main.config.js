const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/main.js",
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      RELEASE_SERVER_URL: process.env.RELEASE_SERVER_URL,
      RELEASE_SERVER_USERNAME: process.env.RELEASE_SERVER_USERNAME,
      RELEASE_SERVER_PASSWORD: process.env.RELEASE_SERVER_PASSWORD,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/assets/images/logo.ico", to: "assets/images/logo.ico" },
        { from: "src/assets/images/logo.png", to: "assets/images/logo.png" },
        { from: "src/assets/images/logo.png", to: "assets/images/logo.icns" },
      ],
    }),
  ],
};
