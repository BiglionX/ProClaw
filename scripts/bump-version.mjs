import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = {
  packageJson: path.join(root, "package.json"),
  tauriConf: path.join(root, "src-tauri", "tauri.conf.json"),
  cargoToml: path.join(root, "src-tauri", "Cargo.toml"),
  appVersion: path.join(root, "src", "lib", "appVersion.ts"),
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(String(v).trim());
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpPatch(v) {
  const p = parseVersion(v);
  p.patch += 1;
  return formatVersion(p);
}

function syncVersion(version) {
  const pkg = readJson(files.packageJson);
  pkg.version = version;
  fs.writeFileSync(files.packageJson, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const tauri = readJson(files.tauriConf);
  tauri.version = version;
  fs.writeFileSync(files.tauriConf, `${JSON.stringify(tauri, null, 2)}\n`, "utf8");

  let cargo = fs.readFileSync(files.cargoToml, "utf8");
  cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${version}"`);
  fs.writeFileSync(files.cargoToml, cargo, "utf8");

  const appVersionTs = `/** Desktop app version (synced by scripts/bump-version.mjs) */\nexport const APP_VERSION = '${version}';\n`;
  fs.writeFileSync(files.appVersion, appVersionTs, "utf8");

  console.log(`[bump-version] synced ${version}`);
}

const setArg = process.argv.find((a) => a.startsWith("--set="));
const setFlagIdx = process.argv.indexOf("--set");
const setValue = setArg?.slice("--set=".length) ?? (setFlagIdx >= 0 ? process.argv[setFlagIdx + 1] : undefined);
const current = readJson(files.packageJson).version;
const next = setValue ?? bumpPatch(current);
syncVersion(next);