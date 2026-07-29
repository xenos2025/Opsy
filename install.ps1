[CmdletBinding()]
param(
    [Alias("Host")]
    [ValidateSet("Auto", "Codex", "WorkBuddy", "Both")]
    [string]$TargetHost = "Auto",

    [string]$Source = (Join-Path $PSScriptRoot "skills\opsy"),
    [string]$CodexSkillsRoot,
    [string]$WorkBuddySkillsRoot,
    [switch]$Yes,
    [switch]$DryRun,
    [switch]$Force
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

function Get-InstalledVersion {
    param([Parameter(Mandatory = $true)][string]$Target)
    $versionPath = Join-Path $Target "VERSION"
    if (-not (Test-Path -LiteralPath $versionPath -PathType Leaf)) {
        return $null
    }
    return (Get-Content -Raw -LiteralPath $versionPath).Trim()
}

$sourceRoot = Get-NormalizedPath -Path $Source
if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Opsy source directory not found: $sourceRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "SKILL.md") -PathType Leaf)) {
    throw "Invalid Opsy source: SKILL.md is missing"
}
$sourceVersionPath = Join-Path $sourceRoot "VERSION"
if (-not (Test-Path -LiteralPath $sourceVersionPath -PathType Leaf)) {
    throw "Invalid Opsy source: VERSION is missing"
}
$sourceVersion = (Get-Content -Raw -LiteralPath $sourceVersionPath).Trim()

$userHomeDir = [Environment]::GetFolderPath("UserProfile")
$codexHomeDir = if ($env:CODEX_HOME) {
    $env:CODEX_HOME
} else {
    Join-Path $userHomeDir ".codex"
}
$workBuddyHomeDir = if ($env:WORKBUDDY_HOME) {
    $env:WORKBUDDY_HOME
} else {
    Join-Path $userHomeDir ".workbuddy"
}

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

$hostPlans = @()
switch ($TargetHost) {
    "Codex" {
        $hostPlans += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot }
    }
    "WorkBuddy" {
        $hostPlans += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot }
    }
    "Both" {
        $hostPlans += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot }
        $hostPlans += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot }
    }
    "Auto" {
        if (Test-Path -LiteralPath $codexHomeDir -PathType Container) {
            $hostPlans += [pscustomobject]@{ Name = "Codex"; Root = $codexRoot }
        }
        if (Test-Path -LiteralPath $workBuddyHomeDir -PathType Container) {
            $hostPlans += [pscustomobject]@{ Name = "WorkBuddy"; Root = $workBuddyRoot }
        }
        if ($hostPlans.Count -eq 0) {
            throw "No Codex or WorkBuddy home was detected. Use -Host Codex, -Host WorkBuddy, or explicit skills roots."
        }
    }
}

$plans = foreach ($hostPlan in $hostPlans) {
    $target = Get-NormalizedPath -Path (Join-Path $hostPlan.Root "opsy")
    if ($target -eq $sourceRoot) {
        throw "Source and installation target are the same directory: $target"
    }
    $currentVersion = Get-InstalledVersion -Target $target
    $action = if (-not (Test-Path -LiteralPath $target)) {
        "install"
    } elseif ($currentVersion -eq $sourceVersion -and -not $Force) {
        "up-to-date"
    } else {
        "archive-and-install"
    }
    $displayCurrentVersion = if ($currentVersion) { $currentVersion } else { "none/unknown" }
    [pscustomobject]@{
        Host = $hostPlan.Name
        SkillsRoot = $hostPlan.Root
        Target = $target
        CurrentVersion = $displayCurrentVersion
        NewVersion = $sourceVersion
        Action = $action
    }
}

Write-Host "Opsy installer plan"
$plans | Format-Table Host, Action, CurrentVersion, NewVersion, Target -AutoSize

$changes = @($plans | Where-Object { $_.Action -ne "up-to-date" })
if ($changes.Count -eq 0) {
    Write-Host "Opsy $sourceVersion is already installed for every selected host."
    exit 0
}
if ($DryRun) {
    Write-Host "Dry run only; no files changed."
    exit 0
}

if (-not $Yes) {
    $answer = Read-Host "Proceed with the displayed installation plan? [y/N]"
    if ($answer -notmatch "^(y|yes)$") {
        Write-Host "Cancelled; no files changed."
        exit 1
    }
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
foreach ($plan in $changes) {
    New-Item -ItemType Directory -Force -Path $plan.SkillsRoot | Out-Null
    if (Test-Path -LiteralPath $plan.Target -PathType Container) {
        $backupRoot = Join-Path $plan.SkillsRoot ".opsy-backups"
        New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
        $backupPath = Join-Path $backupRoot "opsy-$($plan.CurrentVersion)-$timestamp"
        if (Test-Path -LiteralPath $backupPath) {
            throw "Backup target already exists: $backupPath"
        }
        Move-Item -LiteralPath $plan.Target -Destination $backupPath
        Write-Host "Archived $($plan.Host) installation to $backupPath"
    }
    Copy-Item -LiteralPath $sourceRoot -Destination $plan.Target -Recurse
    $verifiedVersion = Get-InstalledVersion -Target $plan.Target
    if ($verifiedVersion -ne $sourceVersion) {
        throw "Verification failed for $($plan.Host): expected $sourceVersion, got $verifiedVersion"
    }
    Write-Host "Installed Opsy $sourceVersion for $($plan.Host): $($plan.Target)"
}

Write-Host "Installation complete. Customer workspaces were not modified."
