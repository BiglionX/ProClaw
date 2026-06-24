import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const releaseDir = path.join(root, "RELEASES", `v${version}`);
const artifacts = [
  { sub: "nsis", name: `ProClaw_${version}_x64-setup.exe` },
  { sub: "msi", name: `ProClaw_${version}_x64_en-US.msi` },
];

function findArtifact(name) {
  const local = path.join(root, "src-tauri", "target", "release", "bundle");
  for (const { sub, name: n } of artifacts) {
    if (n !== name) continue;
    const p = path.join(local, sub, n);
    if (fs.existsSync(p)) return p;
  }
  const cacheRoot = path.join(process.env.LOCALAPPDATA || "", "Temp", "cursor-sandbox-cache");
  if (fs.existsSync(cacheRoot)) {
    const hits = [];
    function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name === name) hits.push(p);
      }
    }
    walk(cacheRoot);
    hits.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (hits[0]) return hits[0];
  }
  return null;
}

fs.mkdirSync(releaseDir, { recursive: true });
let copied = 0;
for (const { name } of artifacts) {
  const src = findArtifact(name);
  if (!src) { console.warn(`[copy-release] skip: ${name}`); continue; }
  const dest = path.join(releaseDir, name);
  fs.copyFileSync(src, dest);
  console.log(`[copy-release] ${dest} <- ${src}`);
  copied += 1;
}
if (copied === 0) { console.error("[copy-release] no artifacts"); process.exit(1); }
console.log(`[copy-release] done -> RELEASES/v${version}/`);