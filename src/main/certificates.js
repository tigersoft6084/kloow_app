const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");
const sudo = require("sudo-prompt");

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
        const output = execSync(
          "certutil -store Root 75358677431cebdf2a7f3b23dd765305f7037a1d",
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return output.includes("75358677431cebdf2a7f3b23dd765305f7037a1d");
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
      const certutilCommand = path.join(__dirname, "..", "..", "..", "run.bat");
      try {
        await fs.access(certutilCommand);
        const output = execSync(`"${certutilCommand}"`, {
          encoding: "utf8",
          stdio: "pipe",
        });
        return { status: true, message: output };
      } catch (error) {
        return { status: false, message: error.message };
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
