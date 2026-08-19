import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const type = process.argv[2] || "patch";

const desktopPkgPath = path.join(__dirname, "..", "apps", "desktop", "package.json");
const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf8"));

const [major, minor, patch] = desktopPkg.version.split(".").map(Number);
let newVersion;
if (type === "major") newVersion = `${major + 1}.0.0`;
else if (type === "minor") newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

desktopPkg.version = newVersion;
fs.writeFileSync(desktopPkgPath, JSON.stringify(desktopPkg, null, 2) + "\n");
console.log(`Desktop version bumped to ${newVersion}`);

const rootPkgPath = path.join(__dirname, "..", "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
rootPkg.version = newVersion;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
console.log(`Root version bumped to ${newVersion}`);

try {
  execSync("git add -A", { cwd: path.join(__dirname, "..") });
  execSync(`git commit -m "chore: release ${newVersion}"`, { cwd: path.join(__dirname, "..") });
  execSync(`git tag v${newVersion}`, { cwd: path.join(__dirname, "..") });
  console.log(`Tagged v${newVersion}`);
  console.log("Run 'git push && git push --tags' to publish");
} catch (e) {
  console.log("Git commit/tag skipped (no changes or not a git repo)");
}