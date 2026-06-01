import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cacheDir = path.join(rootDir, ".cache");
const stagingDir = path.join(cacheDir, "tizen-package");
const defaultAppName = "Nuvio TV";
const defaultPackageId = process.env.TIZEN_PACKAGE_ID || "NuvioTVH01";
const defaultAppId = process.env.TIZEN_APP_ID || `${defaultPackageId}.NuvioTVHosted`;

function normalizeVersion(version) {
  const parts = String(version || "0.0.0")
    .replace(/^v/i, "")
    .split(".")
    .map((part) => String(Number.parseInt(part, 10) || 0));
  while (parts.length < 3) {
    parts.push("0");
  }
  return parts.slice(0, 3).join(".");
}

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
  return normalizeVersion(packageJson.version || "0.0.0");
}

function updateConfigXml(configXml, { version, appId, packageId, appName }) {
  let next = configXml;
  next = next.replace(/(<widget\b[^>]*\bversion=")[^"]*(")/, `$1${version}$2`);
  next = next.replace(/<tizen:application id="[^"]*" package="[^"]*"/, `<tizen:application id="${appId}" package="${packageId}"`);
  if (/<name>[\s\S]*?<\/name>/.test(next)) {
    next = next.replace(/<name>[\s\S]*?<\/name>/, `<name>${appName}</name>`);
  }
  return next;
}

async function stagePackage({ version, appId, packageId, appName }) {
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  await Promise.all([
    cp(path.join(rootDir, "index.html"), path.join(stagingDir, "index.html")),
    cp(path.join(rootDir, "main.js"), path.join(stagingDir, "main.js"))
  ]);

  const configXml = await readFile(path.join(rootDir, "config.xml"), "utf8");
  await writeFile(
    path.join(stagingDir, "config.xml"),
    updateConfigXml(configXml, { version, appId, packageId, appName }),
    "utf8"
  );

  const iconPath = path.join(rootDir, "icon.png");
  if (await pathExists(iconPath)) {
    await cp(iconPath, path.join(stagingDir, "icon.png"));
  }
}

async function addDirectoryToZip(zip, dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, baseDir);
    } else if (entry.isFile()) {
      zip.file(relativePath, await readFile(fullPath));
    }
  }
}

function parseArgs(argv) {
  const options = {
    outDir: rootDir,
    appId: defaultAppId,
    packageId: defaultPackageId,
    appName: defaultAppName,
    outputName: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--outdir") {
      options.outDir = path.resolve(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--app-id") {
      options.appId = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--package-id") {
      options.packageId = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--app-name") {
      options.appName = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--output-name") {
      options.outputName = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.appId || !options.packageId || !options.appName) {
    throw new Error("Tizen app id, package id, and app name are required.");
  }

  return options;
}

async function packageHostedTizen() {
  const options = parseArgs(process.argv.slice(2));
  const version = await readPackageVersion();
  await stagePackage({ ...options, version });

  await mkdir(options.outDir, { recursive: true });
  const outputName = options.outputName || `NuvioTV-Tizen-${version}.wgt`;
  const outputPath = path.join(options.outDir, outputName);
  const zip = new JSZip();
  await addDirectoryToZip(zip, stagingDir);
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE"
  });
  await writeFile(outputPath, buffer);

  console.log(`Hosted Tizen WGT created: ${outputPath}`);
  console.log(`Tizen application id: ${options.appId}`);
  console.log(`Tizen package id: ${options.packageId}`);
}

try {
  await packageHostedTizen();
} catch (error) {
  console.error("\nHosted Tizen packaging failed:");
  console.error(error);
  process.exit(1);
}
