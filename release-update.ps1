# RIDE Auto-Update Release Script
# Commits all changes, pushes main, bumps the version, creates a git tag and
# pushes it. GitHub Actions (release-engine.yml) then builds + publishes the
# new installer, and installed RIDE versions get the update popup.
#
# Usage:  powershell -ExecutionPolicy Bypass -File release-update.ps1 [-Message "fix: ..."] [-Bump patch]

param(
    [string]$Message = "",
    [string]$Bump = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]]$cmd)
    & git @cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($cmd -join ' ') failed (exit $LASTEXITCODE)" }
}

Write-Host "=== RIDE Auto-Update Release ===" -ForegroundColor Cyan

# 0. Clear a stale index lock from an interrupted run
$lock = Join-Path $Root ".git\index.lock"
if (Test-Path $lock) {
    Write-Host "Removing stale .git/index.lock" -ForegroundColor Yellow
    Remove-Item $lock -Force
}

# 1. Sanity: must be a git repo with origin
if (-not (Test-Path (Join-Path $Root ".git"))) { throw "Not a git repository: $Root" }
$remote = (& git -C $Root remote get-url origin 2>$null)
if (-not $remote) { throw "No 'origin' remote configured" }
$branch = & git -C $Root branch --show-current
if (-not $branch) { throw "Not on a branch - checkout a branch first (e.g. master)" }
Write-Host "Remote: $remote"
Write-Host "Branch: $branch"

# 2. Commit everything (untracked + modified files)
Set-Location $Root
if ($Message -eq "") {
    $Message = "fix: dashboard window + release pipeline fixes"
}
Invoke-Git add -A
Invoke-Git commit -m $Message
Write-Host "Committed: $Message"

# 3. Push the branch first (quality gates run here; release only happens on tag push)
Invoke-Git push origin $branch
Write-Host "Pushed $branch"

# 4. Compute the next version
$versionJson = (& node (Join-Path $Root "scripts\semantic-version.mjs") --json 2>&1) | Out-String
$analysis = $versionJson | ConvertFrom-Json
$next = $analysis.next
$current = $analysis.current
Write-Host "Current version: $current"
Write-Host "Computed next:   $next"

# 5. If the commit type produced no bump (e.g. non-conventional message), force a patch bump
if ($next -eq $current -or $next -eq "") {
    if ($Bump -eq "") { $Bump = "patch" }
    Write-Host "No version bump detected - forcing a $Bump bump" -ForegroundColor Yellow
    $parts = $current.Split(".")
    switch ($Bump) {
        "major" { $next = "$([int]$parts[0] + 1).0.0" }
        "minor" { $next = "$($parts[0]).$([int]$parts[1] + 1).0" }
        default { $next = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)" }
    }
}
& node (Join-Path $Root "scripts\semantic-version.mjs") --set $next
if ($LASTEXITCODE -ne 0) { throw "Failed to set version to $next" }
Invoke-Git add -A
Invoke-Git commit -m "chore: bump version to $next"
Invoke-Git push origin $branch
Write-Host "Bumped version to $next and pushed"

# 6. Tag and push - THIS triggers the GitHub Actions release
$tag = "v$next"
if (& git tag -l $tag) {
    Write-Host "Tag $tag already exists locally - removing and recreating" -ForegroundColor Yellow
    & git tag -d $tag
}
Invoke-Git tag -a $tag -m "RIDE $tag"
Invoke-Git push origin $tag --force
Write-Host "Pushed tag: $tag"

# 7. Done - print the Actions URL
$repoPath = $remote -replace ".*github.com[:/](.+?)(\.git)?$", '$1'
Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Release pipeline running at:"
Write-Host "  https://github.com/$repoPath/actions" -ForegroundColor Green
Write-Host ""
Write-Host "The installer (v$next) will be published to:"
Write-Host "  https://github.com/$repoPath/releases/tag/$tag" -ForegroundColor Green
Write-Host "Installed RIDE versions will show the update popup on next launch."
