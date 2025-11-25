const path = require("path");
const fs = require("fs");
const { MSICreator } = require("electron-wix-msi");

// App info
const appName = "Kloow";
const appVersion = "1.2.0"; // replace with your package.json version if needed
const manufacturer = "Kloow Inc.";

// Paths
const outDir = path.join(__dirname, "out"); // Forge output folder
const appDir = path.join(outDir, `${appName}-win32-x64`); // packaged app
const msiOutDir = path.join(outDir, "msi");

// Ensure default files exist
const defaultDataDir = path.join(appDir, "resources"); // include in installer
if (!fs.existsSync(defaultDataDir)) {
  fs.mkdirSync(defaultDataDir, { recursive: true });
}

// Default credential.json
const credentialPath = path.join(defaultDataDir, "credential.json");
if (!fs.existsSync(credentialPath)) {
  fs.writeFileSync(
    credentialPath,
    JSON.stringify({ log: "", pwd: "" }, null, 2)
  );
}

// Default settings.json
const settingsPath = path.join(defaultDataDir, "settings.json");
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({ autoLaunch: false }, null, 2)
  );
}

// MSI Creation
(async () => {
  try {
    const msiCreator = new MSICreator({
      appDirectory: appDir,
      outputDirectory: msiOutDir,
      description: `${appName} Application`,
      exe: `${appName}.exe`,
      name: appName,
      manufacturer: manufacturer,
      version: appVersion,
      arch: "x64",
      ui: {
        chooseDirectory: true,
        images: {
          background: path.join(__dirname, "src", "assets", "images", "kloow_bg.jpg"),
          banner: path.join(__dirname, "src", "assets", "images", "kloow_banner.jpg"),
          exclamationIcon: path.join(__dirname, "src", "assets", "images", "logo.ico"),
          infoIcon: path.join(__dirname, "src", "assets", "images", "logo.ico"),
        }
      },
      icon: path.join(__dirname, "src", "assets", "images", "logo.ico"),
    });

    console.log("Generating MSI template...");
    await msiCreator.create();

    console.log("Compiling MSI...");
    await msiCreator.compile();

    console.log(`✅ MSI created successfully at ${msiOutDir}`);
  } catch (error) {
    console.error("❌ Error creating MSI installer:", error);
  }
})();
