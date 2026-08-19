#!/usr/bin/env node
/**
 * Semantic Version Analyzer for RIDE
 * Determines version bump based on conventional commits:
 * - fix: ...          -> patch
 * - feat: ...         -> minor
 * - BREAKING CHANGE:  -> major
 * - ! in header       -> major (e.g., feat!: breaking change)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

function getCurrentVersion() {
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version;
}

function getCommitsSinceLastTag() {
  try {
    const latestTag = execSync("git describe --tags --abbrev=0 2>/dev/null", { 
      cwd: ROOT, 
      encoding: "utf8" 
    }).trim();
    
    const commits = execSync(`git log ${latestTag}..HEAD --pretty=format:%s`, { 
      cwd: ROOT, 
      encoding: "utf8" 
    }).trim();
    
    return commits ? commits.split("\n") : [];
  } catch {
    const commits = execSync("git log --pretty=format:%s", { 
      cwd: ROOT, 
      encoding: "utf8" 
    }).trim();
    return commits ? commits.split("\n") : [];
  }
}

function analyzeCommits(commits) {
  let highestBump = "none";
  const reasons = [];

  const bumpPriority = { none: 0, patch: 1, minor: 2, major: 3 };

  for (const commit of commits) {
    const trimmed = commit.trim();
    if (!trimmed) continue;

    let commitBump = "none";
    let reason = "";

    if (trimmed.includes("BREAKING CHANGE:") || /^\w+!\(/.test(trimmed) || /^\w+!:/.test(trimmed)) {
      commitBump = "major";
      reason = `Breaking change: ${trimmed.substring(0, 60)}...`;
    }
    else if (/^feat(\(.+\))?:/.test(trimmed)) {
      commitBump = "minor";
      reason = `New feature: ${trimmed.substring(0, 60)}...`;
    }
    else if (/^fix(\(.+\))?:/.test(trimmed)) {
      commitBump = "patch";
      reason = `Bug fix: ${trimmed.substring(0, 60)}...`;
    }
    else if (/^(perf|refactor|style|test|chore|build|ci|docs|revert)(\(.+\))?:/.test(trimmed)) {
      continue;
    }

    if (commitBump !== "none" && bumpPriority[commitBump] > bumpPriority[highestBump]) {
      highestBump = commitBump;
    }
    if (reason) reasons.push(reason);
  }

  return { bump: highestBump, reasons };
}

function calculateNextVersion(current, bump) {
  if (bump === "none") return current;

  const [major, minor, patch] = current.split(".").map(Number);
  
  switch (bump) {
    case "major": return `${major + 1}.0.0`;
    case "minor": return `${major}.${minor + 1}.0`;
    case "patch": return `${major}.${minor}.${patch + 1}`;
    default: return current;
  }
}

function updatePackageVersions(newVersion) {
  const files = [
    path.join(ROOT, "package.json"),
    path.join(ROOT, "apps", "desktop", "package.json"),
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      pkg.version = newVersion;
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${path.relative(ROOT, file)} to ${newVersion}`);
    }
  }
}

function main() {
  const setIndex = process.argv.indexOf("--set");
  if (setIndex !== -1 && process.argv[setIndex + 1]) {
    const explicit = process.argv[setIndex + 1];
    updatePackageVersions(explicit);
    console.log(`Version set to ${explicit}`);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ current: getCurrentVersion(), next: explicit, bump: "explicit", reason: [] }, null, 2));
    }
    return;
  }

  const current = getCurrentVersion();
  console.log(`Current version: ${current}`);

  const commits = getCommitsSinceLastTag();
  console.log(`Commits since last tag: ${commits.length}`);

  const { bump, reasons } = analyzeCommits(commits);
  console.log(`Detected bump: ${bump}`);
  
  if (reasons.length > 0) {
    console.log("Reasons:");
    for (const r of reasons) console.log(`  - ${r}`);
  }

  const next = calculateNextVersion(current, bump);
  
  if (bump !== "none" && process.argv.includes("--write")) {
    updatePackageVersions(next);
    console.log(`Version updated to ${next}`);
  }

  const result = {
    current,
    next,
    bump,
    reason: reasons,
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.bump === "none") {
    console.log("No version bump needed");
    process.exit(0);
  }
  return result;
}

main();