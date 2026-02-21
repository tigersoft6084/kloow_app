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

const DNR_RESOURCE_TYPES = [
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
];

const BROWSER_GUARD_MANIFEST_TEMPLATE = {
  manifest_version: 3,
  name: "Kloow Browser Guard",
  version: "1.0.0",
  description: "Blocks DevTools shortcuts, context menus, and internal browser URLs.",
  permissions: ["tabs", "webNavigation", "declarativeNetRequest"],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "background.js",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
      run_at: "document_start",
      all_frames: true,
    },
  ],
  declarative_net_request: {
    rule_resources: [{ id: "internal_urls", enabled: true, path: "internal-rules.json" }],
  },
};

const BROWSER_GUARD_RULES_TEMPLATE = [
  {
    id: 1001,
    priority: 1,
    action: { type: "block" },
    condition: {
      regexFilter: "^(?:chrome(?:-[a-z]+)?|devtools|edge|about|view-source):",
      resourceTypes: ["main_frame", "sub_frame"],
    },
  },
];

const BROWSER_GUARD_CONTENT_SCRIPT = `(() => {
  const blockedCtrlShiftCodes = new Set(["KeyI", "KeyJ", "KeyC", "KeyK"]);

  document.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const key = (event.key || "").toLowerCase();
      const code = event.code || "";
      const isF12 = key === "f12" || code === "F12";
      const isCtrlShiftInspect = event.ctrlKey && event.shiftKey && blockedCtrlShiftCodes.has(code);
      const isCtrlU = event.ctrlKey && !event.shiftKey && key === "u";

      if (isF12 || isCtrlShiftInspect || isCtrlU) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  let devtoolsOpen = false;
  setInterval(() => {
    const start = new Date();
    debugger;
    if (!devtoolsOpen && new Date() - start > 100) {
      devtoolsOpen = true;
      try {
        chrome.runtime.sendMessage({ type: "devtools-open" });
      } catch (error) {
        // Ignore runtime messaging errors.
      }
    }
  }, 1000);
})();`;

const BROWSER_GUARD_BACKGROUND_SCRIPT = `const BLOCKED_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "chrome-search:",
  "chrome-untrusted:",
  "devtools:",
  "edge:",
  "about:",
  "view-source:",
]);

function getProtocol(url) {
  if (typeof url !== "string" || url.length === 0) {
    return "";
  }

  if (url.startsWith("view-source:")) {
    return "view-source:";
  }

  try {
    return new URL(url).protocol;
  } catch (error) {
    return "";
  }
}

function isBlockedInternalUrl(url) {
  return BLOCKED_PROTOCOLS.has(getProtocol(url));
}

function closeTabIfNeeded(tabId, url) {
  if (!Number.isInteger(tabId) || tabId < 0 || !isBlockedInternalUrl(url)) {
    return;
  }

  chrome.tabs.remove(tabId, () => {
    if (chrome.runtime.lastError) {
      return;
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || (tab && tab.url);
  closeTabIfNeeded(tabId, targetUrl);
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!details || details.frameId !== 0) {
    return;
  }
  closeTabIfNeeded(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === "devtools-open" && sender && sender.tab && sender.tab.id >= 0) {
    chrome.tabs.remove(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }
});`;

function buildDnrManifest() {
  return JSON.parse(JSON.stringify(DNR_MANIFEST_TEMPLATE));
}

function buildDnrRules(authToken) {
  const normalizedToken = authToken || "";
  return DNR_RESOURCE_TYPES.map((resourceType, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "Seocromom-Authorization",
          operation: "set",
          value: normalizedToken,
        },
        {
          header: "Seocromom-Request-Type",
          operation: "set",
          value: resourceType,
        },
      ],
    },
    condition: {
      urlFilter: "*",
      resourceTypes: [resourceType],
    },
  }));
}

function buildBrowserGuardManifest() {
  return JSON.parse(JSON.stringify(BROWSER_GUARD_MANIFEST_TEMPLATE));
}

function buildBrowserGuardRules() {
  return JSON.parse(JSON.stringify(BROWSER_GUARD_RULES_TEMPLATE));
}

function buildBrowserGuardContentScript() {
  return BROWSER_GUARD_CONTENT_SCRIPT;
}

function buildBrowserGuardBackgroundScript() {
  return BROWSER_GUARD_BACKGROUND_SCRIPT;
}

module.exports = {
  sanitizeAppName,
  getPlatformConfig,
  buildDnrManifest,
  buildDnrRules,
  buildBrowserGuardManifest,
  buildBrowserGuardRules,
  buildBrowserGuardContentScript,
  buildBrowserGuardBackgroundScript,
};
