require("dotenv").config();
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");
const packageJson = require("./package.json");

// Sanitize productName for NuGet package ID and executable name
const sanitizedAppName = packageJson.productName
  .replace(/\s+/g, "")
  .toLowerCase();

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "./src/assets/images/logo",
    name: packageJson.productName,
    executableName: sanitizedAppName,
    appCategoryType: "public.app-category.productivity",
    appBundleId: `com.${sanitizedAppName}.app`,
    win32metadata: {
      CompanyName: packageJson.author.name,
    },
    extraResource: ["./cert.crt", "./scripts/run.bat", "./scripts/sf.bat"],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: sanitizedAppName,
        iconUrl:
          "file:///" +
          path
            .resolve(__dirname, "./src/assets/images/logo.ico")
            .replace(/\\/g, "/"),
        setupIcon: path.resolve(__dirname, "./src/assets/images/logo.ico"),
        skipUpdateIcon: true,
        // Optional: Code signing
        // certificateFile: "./cert.pfx",
        // certificatePassword: process.env.CERTIFICATE_PASSWORD
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "./src/assets/images/logo.icns",
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
      config: {
        icon: "./src/assets/images/logo.icns",
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: "./src/assets/images/logo.png",
          scripts: {
            preinst: "./scripts/preinst.sh",
          },
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          icon: "./src/assets/images/logo.png",
        },
      },
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-electron-release-server",
      config: {
        baseUrl: process.env.RELEASE_SERVER_URL,
        username: process.env.RELEASE_SERVER_USERNAME,
        password: process.env.RELEASE_SERVER_PASSWORD,
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        devContentSecurityPolicy: "connect-src 'self' https://www.kloow.com",
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js",
              },
            },
          ],
        },
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
