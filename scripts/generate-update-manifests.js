"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const makeOutputDir = path.join(projectRoot, "out", "make");
const manifestOutputDir = process.env.UPDATE_MANIFEST_OUTPUT_DIR
  ? path.resolve(projectRoot, process.env.UPDATE_MANIFEST_OUTPUT_DIR)
  : makeOutputDir;

const PLATFORM_CONFIG = {
  linux: {
    label: "Linux",
    manifestNames: ["latest-linux.yml"],
    extensions: [".appimage", ".deb", ".rpm", ".snap", ".tar.xz", ".tar.gz"],
  },
  macos: {
    label: "macOS",
    manifestNames: ["latest-mac.yml", "latest-macos.yml"],
    extensions: [".zip", ".dmg", ".pkg"],
  },
};

function toYamlScalar(value) {
  const text = String(value || "");
  if (/^[a-z0-9._/-]+$/i.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

function readJsonFile(filePath) {
  return fs.promises.readFile(filePath, "utf8").then((raw) => JSON.parse(raw));
}

async function listFilesRecursive(rootDir) {
  const out = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      out.push(fullPath);
    }
  }

  return out;
}

function getExtensionRank(fileName, extensions) {
  const lower = fileName.toLowerCase();
  const idx = extensions.findIndex((ext) => lower.endsWith(ext));
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function isCandidateArtifact(filePath, extensions) {
  const name = path.basename(filePath).toLowerCase();
  if (name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".blockmap")) {
    return false;
  }
  return extensions.some((ext) => name.endsWith(ext));
}

async function pickArtifact(files, extensions, version) {
  const versionLower = String(version || "").toLowerCase();
  const candidates = files.filter((filePath) => isCandidateArtifact(filePath, extensions));
  if (candidates.length === 0) {
    return null;
  }

  const scored = await Promise.all(
    candidates.map(async (filePath) => {
      const stat = await fs.promises.stat(filePath);
      const baseName = path.basename(filePath);
      const lowerName = baseName.toLowerCase();
      return {
        filePath,
        baseName,
        stat,
        hasVersion: versionLower ? lowerName.includes(versionLower) : false,
        extensionRank: getExtensionRank(lowerName, extensions),
      };
    })
  );

  scored.sort((a, b) => {
    if (a.hasVersion !== b.hasVersion) {
      return a.hasVersion ? -1 : 1;
    }
    if (a.extensionRank !== b.extensionRank) {
      return a.extensionRank - b.extensionRank;
    }
    if (a.stat.mtimeMs !== b.stat.mtimeMs) {
      return b.stat.mtimeMs - a.stat.mtimeMs;
    }
    return b.stat.size - a.stat.size;
  });

  return scored[0];
}

function hashFileSha512(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha512");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("base64")));
  });
}

function buildManifestYaml({ version, artifactName, sha512, size, releaseDate }) {
  return [
    `version: ${version}`,
    "files:",
    `  - url: ${toYamlScalar(artifactName)}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${toYamlScalar(artifactName)}`,
    `sha512: ${sha512}`,
    `releaseDate: '${releaseDate}'`,
    "",
  ].join("\n");
}

async function writeManifestFiles(platformKey, manifestYaml) {
  const cfg = PLATFORM_CONFIG[platformKey];
  await fs.promises.mkdir(manifestOutputDir, { recursive: true });
  for (const fileName of cfg.manifestNames) {
    const outputPath = path.join(manifestOutputDir, fileName);
    await fs.promises.writeFile(outputPath, manifestYaml, "utf8");
    console.log(`[update-manifests] ${cfg.label}: wrote ${path.relative(projectRoot, outputPath)}`);
  }
}

async function generatePlatformManifest(platformKey, allFiles, version) {
  const cfg = PLATFORM_CONFIG[platformKey];
  const selected = await pickArtifact(allFiles, cfg.extensions, version);
  if (!selected) {
    console.log(
      `[update-manifests] ${cfg.label}: no installer artifact found in ${path.relative(projectRoot, makeOutputDir)}`
    );
    return false;
  }

  const sha512 = await hashFileSha512(selected.filePath);
  const releaseDate = new Date(selected.stat.mtimeMs).toISOString();
  const manifestYaml = buildManifestYaml({
    version,
    artifactName: selected.baseName,
    sha512,
    size: selected.stat.size,
    releaseDate,
  });

  await writeManifestFiles(platformKey, manifestYaml);
  console.log(
    `[update-manifests] ${cfg.label}: using artifact ${path.relative(projectRoot, selected.filePath)}`
  );
  return true;
}

async function main() {
  const pkg = await readJsonFile(packageJsonPath);
  const version = String(pkg.version || "").trim();
  if (!version) {
    throw new Error("package.json version is missing.");
  }

  if (!fs.existsSync(makeOutputDir)) {
    console.log(
      `[update-manifests] Skipped: ${path.relative(projectRoot, makeOutputDir)} does not exist.`
    );
    return;
  }

  const allFiles = await listFilesRecursive(makeOutputDir);
  if (allFiles.length === 0) {
    console.log(
      `[update-manifests] Skipped: ${path.relative(projectRoot, makeOutputDir)} has no files.`
    );
    return;
  }

  let generatedCount = 0;
  for (const platformKey of Object.keys(PLATFORM_CONFIG)) {
    const generated = await generatePlatformManifest(platformKey, allFiles, version);
    if (generated) {
      generatedCount += 1;
    }
  }

  if (generatedCount === 0) {
    console.log("[update-manifests] No platform manifests were generated.");
  }
}

main().catch((error) => {
  console.error(`[update-manifests] Failed: ${error.message}`);
  process.exitCode = 1;
});
