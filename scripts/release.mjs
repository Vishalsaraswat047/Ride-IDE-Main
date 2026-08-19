#!/usr/bin/env node
/**
 * RIDE Release Trigger
 * 
 * Usage:
 *   node scripts/release.mjs           # Auto-detect from commits
 *   node scripts/release.mjs patch     # Force patch
 *   node scripts/release.mjs minor     # Force minor
 *   node scripts/release.mjs major     # Force major
 *   node scripts/release.mjs --dry-run # Preview only
 */

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

interface ReleaseOptions {
  bumpType?: "auto" | "patch" | "minor" | "major";
  channel?: "stable" | "beta" | "alpha";
  dryRun?: boolean;
  force?: boolean;
}

function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2);
  const options: ReleaseOptions = {
    bumpType: "auto",
    channel: "stable",
    dryRun: false,
    force: false,
  };

  for (const arg of args) {
    if (["patch", "minor", "major"].includes(arg)) {
      options.bumpType = arg;
    } else if (["stable", "beta", "alpha"].includes(arg)) {
      options.channel = arg;
    } else if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
    }
  }

  return options;
}

function runCommand(cmd: string, cwd: string = ROOT): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${e}`);
  }
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(
    execSync("cat package.json", { encoding: "utf8" })
  );
  return pkg.version;
}

function checkWorkingTreeClean(): boolean {
  try {
    const status = runCommand("git status --porcelain");
    return status.length === 0;
  } catch {
    return false;
  }
}

function main() {
  const options = parseArgs();
  const currentVersion = getCurrentVersion();

  console.log("🚀 RIDE Release Trigger");
  console.log("=========================");
  console.log(`Current version: ${currentVersion}`);
  console.log(`Bump type: ${options.bumpType}`);
  console.log(`Channel: ${options.channel}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log("");

  // Check working tree
  if (!options.force && !checkWorkingTreeClean()) {
    console.error("❌ Working tree has uncommitted changes. Commit or stash them first.");
    console.error("   Use --force to override");
    process.exit(1);
  }

  // Run quality gates first
  console.log("🔍 Running quality gates...");
  try {
    runCommand("pnpm run lint");
    console.log("✓ Lint passed");
    runCommand("pnpm run typecheck");
    console.log("✓ Typecheck passed");
    runCommand("pnpm run test");
    console.log("✓ Tests passed");
    runCommand("pnpm run build");
    console.log("✓ Build passed");
  } catch (e) {
    console.error("❌ Quality gates failed:");
    console.error(e);
    process.exit(1);
  }

  // Determine version
  let newVersion: string;
  if (options.bumpType === "auto") {
    // Use semantic version analyzer
    const result = JSON.parse(
      runCommand("node scripts/semantic-version.mjs --json | tail -1")
    );
    newVersion = result.next;
    console.log(`Auto-detected bump: ${result.bump} → ${newVersion}`);
  } else {
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    switch (options.bumpType) {
      case "major": newVersion = `${major + 1}.0.0`; break;
      case "minor": newVersion = `${major}.${minor + 1}.0`; break;
      case "patch": newVersion = `${major}.${minor}.${patch + 1}`; break;
    }
    console.log(`Forced ${options.bumpType} bump: ${currentVersion} → ${newVersion}`);
  }

  if (options.dryRun) {
    console.log("\n🔍 DRY RUN - Would release:");
    console.log(`   Version: ${currentVersion} → ${newVersion}`);
    console.log(`   Channel: ${options.channel}`);
    console.log("   Steps: lint → typecheck → test → build → package → tag → push → release");
    return;
  }

  // Update package versions
  console.log("\n📝 Updating package.json versions...");
  runCommand(`node scripts/semantic-version.mjs --write`);

  // Commit and tag
  console.log("\n🏷️  Creating release commit and tag...");
  runCommand("git add package.json apps/desktop/package.json");
  runCommand(`git commit -m "chore: release ${newVersion}"`);
  runCommand(`git tag v${newVersion}`);

  // Push
  console.log("\n📤 Pushing to GitHub...");
  runCommand("git push");
  runCommand("git push --tags");

  console.log("\n✅ Release triggered!");
  console.log(`   Version: ${newVersion}`);
  console.log(`   Channel: ${options.channel}`);
  console.log(`   Tag: v${newVersion}`);
  console.log("");
  console.log("🔄 GitHub Actions will now:");
  console.log("   1. Run quality gates");
  console.log("   2. Build Windows installer");
  console.log("   3. Create GitHub Release");
  console.log("   4. Publish to GitHub Releases");
  console.log("");
  console.log("📊 Monitor: https://github.com/Vishalsaraswat047/Ride-IDE-Main/actions");
}

main();