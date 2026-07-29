[CmdletBinding()]
param(
    [Alias("Host")]
    [ValidateSet("Auto", "Codex", "WorkBuddy", "Both")]
    [string]$TargetHost = "Auto",

    [string]$CodexSkillsRoot,
    [string]$WorkBuddySkillsRoot,
    [switch]$Yes,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
}

function Assert-SafeSkillsRoot {
    param([Parameter(Mandatory = $true)][string]$Path)
    $full = Get-NormalizedPath -Path $Path
    $root = [System.IO.Path]::GetPathRoot($full).TrimEnd("\", "/")
    $userHomeDir = [Environment]::GetFolderPath("UserProfile").TrimEnd("\", "/")
    if ($full.TrimEnd("\", "/") -eq $root -or $full -eq $userHomeDir) {
        throw "Refusing unsafe skills root: $full"
    }
    return $full
}

$userHomeDir = [Environment]::GetFolderPath("UserProfile")
$codexHomeDir = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $userHomeDir ".codex" }
$workBuddyHomeDir = if ($env:WORKBUDDY_HOME) { $env:WORKBUDDY_HOME } else { Join-Path $userHomeDir ".workbuddy" }
$codexRootCandidate = if ($CodexSkillsRoot) {
    $CodexSkillsRoot
} else {
    Join-Path $codexHomeDir "skills"
}
$workBuddyRootCandidate = if ($WorkBuddySkillsRoot) {
    $WorkBuddySkillsRoot
} else {
    Join-Path $workBuddyHomeDir "skills"
}
$codexRoot = Assert-SafeSkillsRoot -Path $codexRootCandidate
$workBuddyRoot = Assert-SafeSkillsRoot -Path $workBuddyRootCandidate

$roots = @()
switch ($TargetHost) {
    "Codex" { $roots += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot } }
    "WorkBuddy" { $roots += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot } }
    "Both" {
        $roots += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot }
        $roots += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot }
    }
    "Auto" {
        if (Test-Path -LiteralPath (Join-Path $codexRoot "opsy")) {
            $roots += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot }
        }
        if (Test-Path -LiteralPath (Join-Path $workBuddyRoot "opsy")) {
            $roots += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot }
        }
    }
}

$targets = @(
    $roots |
        ForEach-Object {
            [pscustomobject]@{
                Host = $_.Name
                Root = $_.Root
                Target = Join-Path $_.Root "opsy"
            }
        } |
        Where-Object { Test-Path -LiteralPath $_.Target -PathType Container }
)

if ($targets.Count -eq 0) {
    Write-Host "No selected Opsy installation was found. Customer workspaces were not inspected."
    exit 0
}

Write-Host "Opsy uninstall plan (recoverable archive)"
$targets | Format-Table Host, Target -AutoSize
if ($DryRun) {
    Write-Host "Dry run only; no files changed."
    exit 0
}
if (-not $Yes) {
    $answer = Read-Host "Archive the displayed Opsy installations? [y/N]"
    if ($answer -notmatch "^(y|yes)$") {
        Write-Host "Cancelled; no files changed."
        exit 1
    }
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
foreach ($target in $targets) {
    $backupRoot = Join-Path $target.Root ".opsy-backups"
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    $backupPath = Join-Path $backupRoot "opsy-uninstalled-$timestamp"
    if (Test-Path -LiteralPath $backupPath) {
        throw "Backup target already exists: $backupPath"
    }
    Move-Item -LiteralPath $target.Target -Destination $backupPath
    Write-Host "Archived $($target.Host) Opsy installation to $backupPath"
}

Write-Host "Uninstall complete. Customer workspaces were not inspected or modified."
