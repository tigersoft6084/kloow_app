const path = require("path");
const fs = require("fs");
const { MSICreator } = require("electron-wix-msi");

// App info
const appName = "Kloow";
const appVersion = "1.0.0"; // replace with your package.json version if needed
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

// Copy certificate and create a small PowerShell runner into the app resources
try {
  const projectCert = path.join(__dirname, "cert.crt");
  const destCert = path.join(defaultDataDir, "cert.crt");
  if (fs.existsSync(projectCert)) {
    fs.copyFileSync(projectCert, destCert);
    console.log(`Copied cert.crt to ${destCert}`);
  } else {
    console.warn(`No cert.crt found at ${projectCert}. Skipping copy.`);
  }

  // Also copy the scripts/install-cert.ps1 from project scripts if present
  const runnerSrc = path.join(__dirname, "scripts", "install-cert.ps1");
  const runnerDest = path.join(defaultDataDir, "install-cert.ps1");
  if (fs.existsSync(runnerSrc)) {
    fs.copyFileSync(runnerSrc, runnerDest);
    console.log(`Copied install-cert.ps1 to ${runnerDest}`);
  } else {
    // create a minimal fallback script in resources if scripts file is not present
    const psContent = `# Fallback installer script\n$certPath = Join-Path -Path $PSScriptRoot -ChildPath 'cert.crt'\nif (-not (Test-Path -Path $certPath)) { Write-Output \"Certificate not found at $certPath\"; exit 0 }\n& certutil -addstore -f \"Root\" \"$certPath\"`;
    fs.writeFileSync(runnerDest, psContent, { encoding: "utf8" });
    console.log(`Wrote fallback install-cert.ps1 to ${runnerDest}`);
  }
} catch (err) {
  console.warn("Could not copy cert or script into resources:", err.message);
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
      upgradeCode: "56cd20a0-43a5-4dbd-98e3-22c9d24a0f8d",
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

    console.log("MSI template generated. Injecting post-install custom action to run certificate installer...");

    try {
      // find the generated .wxs file in the output directory and inject a CustomAction
      const wixFiles = fs.readdirSync(msiOutDir).filter((f) => f.endsWith('.wxs'));
      if (wixFiles.length > 0) {
        const wixPath = path.join(msiOutDir, wixFiles[0]);
        let wixContent = fs.readFileSync(wixPath, 'utf8');

        // Attempt to find the File Id for install-cert.ps1 so we can reference it with [#fileId]
        let fileIdMatch = wixContent.match(/<File[^>]*Name="install-cert.ps1"[^>]*Id="([^"]+)"/i);
        let fileRef = null;
        if (fileIdMatch && fileIdMatch[1]) {
          fileRef = `[#${fileIdMatch[1]}]`;
          console.log(`Found install-cert.ps1 File Id: ${fileIdMatch[1]}`);
        } else {
          // fallback to APPLICATIONROOTDIRECTORY path
          fileRef = `[APPLICATIONROOTDIRECTORY]resources\\install-cert.ps1`;
          console.warn('Could not locate install-cert.ps1 File Id in .wxs; falling back to APPLICATIONROOTDIRECTORY path.');
        }

        const customActionXml = `\n  <!-- Custom action to run PowerShell and install bundled cert.crt -->\n  <CustomAction Id=\"InstallCertificate\" Execute=\"deferred\" Return=\"ignore\" Impersonate=\"no\" ExeCommand=\"[SystemFolder]WindowsPowerShell\\v1.0\\powershell.exe -ExecutionPolicy Bypass -File \&quot;${fileRef}\&quot;\" Directory=\"TARGETDIR\" />\n  <InstallExecuteSequence>\n    <Custom Action=\"InstallCertificate\" After=\"InstallFiles\">NOT Installed</Custom>\n  </InstallExecuteSequence>\n`;

        // insert before closing </Product>
        if (wixContent.indexOf('</Product>') !== -1) {
          wixContent = wixContent.replace('</Product>', customActionXml + '\n</Product>');
          fs.writeFileSync(wixPath, wixContent, 'utf8');
          console.log(`Injected custom action into ${wixPath}`);
        } else {
          console.warn('Could not find </Product> tag to inject custom action. Skipping injection.');
        }
      } else {
        console.warn('No .wxs files found in MSI output directory, skipping custom action injection.');
      }
    } catch (err) {
      console.warn('Failed to inject custom action into generated WiX template:', err.message);
    }

    console.log("Compiling MSI...");
    await msiCreator.compile();

    console.log(`✅ MSI created successfully at ${msiOutDir}`);
  } catch (error) {
    console.error("❌ Error creating MSI installer:", error);
  }
})();
