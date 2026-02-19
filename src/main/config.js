const path = require("path");

function sanitizeAppName(productName) {
  return productName.replace(/\s+/g, "").toLowerCase();
}

function getPlatformConfig(app) {
  const baseBrowserPath = path.join(app.getPath("userData"), "Browser", app.getVersion());

  const config = {
    win32: {
      downloadUrl: "https://www.kloow.com/download",
      zipHash: "561534acc5a7ca9f3457c30827a6d9620ea815277e77b6d1df4be174ca5c1062",
      iconFile: "logo.ico",
      // executableName: "GoogleChromePortable.exe",
      executableName: "chrome.exe",
      appPath: baseBrowserPath,
      zipPath: path.join(baseBrowserPath, "browser.zip"),
    },
    linux: {
      downloadUrl: "https://www.kloow.com/download_linux",
      zipHash: "eff97e60595176b7403373df14a046da60ffed3950196ba57479a9c20a87a7b5",
      iconFile: "logo.png",
      executableName: "chrome",
      appPath: baseBrowserPath,
      zipPath: path.join(baseBrowserPath, "browser.zip"),
    },
    darwin: {
      downloadUrl: "https://www.kloow.com/download_mac",
      zipHash: "f732d25747ee51d5af8ca8c7ec30d41c10686a044414dc81af17106443ef7515",
      iconFile: "logo.png",
      executableName: "Chromium.app/Contents/MacOS/Chromium",
      appPath: baseBrowserPath,
      zipPath: path.join(baseBrowserPath, "browser.tar.xz"),
    },
  };

  return config[process.platform] || config.win32;
}

const DNR_MANIFEST_TEMPLATE = {
  manifest_version: 3,
  name: "Global Header Injector",
  version: "1.0.0",
  permissions: ["declarativeNetRequest"],
  host_permissions: ["<all_urls>"],
  declarative_net_request: {
    rule_resources: [{ id: "ruleset_1", enabled: true, path: "rules.json" }],
  },
};

const DNR_RULES_TEMPLATE = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "Seocromom-Authorization",
          operation: "set",
          value: "",
        },
      ],
    },
    condition: {
      urlFilter: "*",
      resourceTypes: [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "webtransport",
        "webbundle",
        "other",
      ],
    },
  },
];

function buildDnrManifest() {
  return JSON.parse(JSON.stringify(DNR_MANIFEST_TEMPLATE));
}

function buildDnrRules(authToken) {
  const rules = JSON.parse(JSON.stringify(DNR_RULES_TEMPLATE));
  rules[0].action.requestHeaders[0].value = authToken || "";
  return rules;
}

module.exports = {
  sanitizeAppName,
  getPlatformConfig,
  buildDnrManifest,
  buildDnrRules
};
