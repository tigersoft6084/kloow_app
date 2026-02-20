const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");
const sudo = require("sudo-prompt");

const WINDOWS_CERT_THUMBPRINT = "75358677431CEBDF2A7F3B23DD765305F7037A1D";

function normalizeHex(value = "") {
  return value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

function hasWindowsCertInRootStore(userScope = false) {
  const userFlag = userScope ? "-user " : "";
  const output = execSync(`certutil ${userFlag}-store Root`, {
    encoding: "utf8",
    stdio: "pipe",
  });

  return normalizeHex(output).includes(WINDOWS_CERT_THUMBPRINT);
}

async function resolveWindowsCertPath() {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "cert.crt"));
  }
  candidates.push(path.join(__dirname, "..", "..", "..", "cert.crt"));
  candidates.push(path.join(process.cwd(), "cert.crt"));

  for (const certPath of candidates) {
    try {
      await fs.access(certPath);
      return certPath;
    } catch (error) {
      // Try next candidate.
    }
  }

  throw new Error("cert.crt not found in expected locations.");
}

function installWindowsCertToMachineStore(certPath) {
  return new Promise((resolve, reject) => {
    sudo.exec(
      `certutil -addstore -f "Root" "${certPath}"`,
      { name: "Kloow" },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout || stderr || "");
      }
    );
  });
}

function registerCertificateHandlers(ipcMain) {
  ipcMain.handle("check-cert", () => {
    if (process.platform === "linux") {
      try {
        execSync(
          'certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Kloow Root CA" -i /usr/lib/kloow/resources/cert.crt',
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return true;
      } catch (error) {
        return false;
      }
    } else if (process.platform === "darwin") {
      try {
        const output = execSync(
          'security find-certificate -a -p /Library/Keychains/System.keychain | grep "MIIFYTCCA0mgAwIBAgIUHc92kSgRc8s69CqCPcHaweNZEwgwDQYJKoZIhvcNAQEL"',
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return output !== "";
      } catch (error) {
        return false;
      }
    } else {
      try {
        if (hasWindowsCertInRootStore(false)) {
          return true;
        }
      } catch (error) {
        // Fall through to user store check.
      }

      try {
        return hasWindowsCertInRootStore(true);
      } catch (error) {
        return false;
      }
    }
  });

  ipcMain.handle("check-cert-trusted", () => {
    if (process.platform === "darwin") {
      console.log("Checking if Kloow Root CA is trusted...");
      try {
        const checkTrustStatus = execSync(
          "security verify-cert -c /Applications/Kloow.app/Contents/Resources/cert.crt",
          { encoding: "utf8", stdio: "pipe" }
        );
        console.log("Trust status output:", checkTrustStatus);
        if (
          !checkTrustStatus ||
          checkTrustStatus.indexOf("certificate verification successful") === -1
        ) {
          console.log("Certificate is not trusted.");
          return false;
        }
      } catch (err) {
        console.error("Error checking trust status:", err);
        return false;
      }
    }
    console.log("Certificate is trusted.");
    return true;
  });

  ipcMain.handle("install-cert", async () => {
    if (process.platform === "linux") {
      const certPath = "/usr/lib/kloow/resources/cert.crt";
      try {
        await fs.access(certPath);
        const output = execSync(
          `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Kloow Root CA" -i ${certPath}`,
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return { status: true, message: output };
      } catch (error) {
        return { status: false, message: error.message };
      }
    } else if (process.platform === "darwin") {
      const certPath = "/Applications/kloow.app/Contents/Resources/cert.crt";
      try {
        await fs.access(certPath);
        const output = await new Promise((resolve, reject) => {
          sudo.exec(
            `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certPath}`,
            { name: "Kloow" },
            (error, stdout) => {
              if (error) {
                console.error("Error:", error);
                reject(error);
              } else {
                console.log("Output:", stdout);
                resolve(stdout);
              }
            }
          );
        });

        return { status: true, message: output };
      } catch (error) {
        console.log(error);
        return { status: true, message: error.message };
      }
    } else {
      try {
        const certPath = await resolveWindowsCertPath();
        const machineOutput = await installWindowsCertToMachineStore(certPath);
        return { status: true, message: machineOutput };
      } catch (machineError) {
        return {
          status: false,
          message: `Machine store install failed: ${machineError.message}`,
        };
      }
    }
  });

  ipcMain.handle("mark-cert-trusted", async () => {
    execSync('open -a "Keychain Access"', { stdio: "ignore" });
    return { status: true, message: "Keychain Access opened." };
  });
}

module.exports = {
  registerCertificateHandlers,
};
