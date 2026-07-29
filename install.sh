#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
target_host="auto"
source_dir="$script_dir/skills/opsy"
codex_skills_root=""
workbuddy_skills_root=""
assume_yes="false"
dry_run="false"
force_install="false"

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options]

Options:
  --host auto|codex|workbuddy|both
  --source PATH
  --codex-root PATH
  --workbuddy-root PATH
  --yes
  --dry-run
  --force
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) target_host="${2:?missing value for --host}"; shift 2 ;;
    --source) source_dir="${2:?missing value for --source}"; shift 2 ;;
    --codex-root) codex_skills_root="${2:?missing value for --codex-root}"; shift 2 ;;
    --workbuddy-root) workbuddy_skills_root="${2:?missing value for --workbuddy-root}"; shift 2 ;;
    --yes) assume_yes="true"; shift ;;
    --dry-run) dry_run="true"; shift ;;
    --force) force_install="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$target_host" in
  auto|codex|workbuddy|both) ;;
  *) echo "--host must be auto, codex, workbuddy, or both" >&2; exit 2 ;;
esac

if [[ ! -d "$source_dir" || ! -f "$source_dir/SKILL.md" || ! -f "$source_dir/VERSION" ]]; then
  echo "Invalid Opsy source directory: $source_dir" >&2
  exit 2
fi

source_dir="$(cd "$source_dir" && pwd -P)"
source_version="$(tr -d '[:space:]' < "$source_dir/VERSION")"
user_home_dir="${HOME:?HOME is required}"
codex_home_dir="${CODEX_HOME:-$user_home_dir/.codex}"
workbuddy_home_dir="${WORKBUDDY_HOME:-$user_home_dir/.workbuddy}"
codex_skills_root="${codex_skills_root:-$codex_home_dir/skills}"
workbuddy_skills_root="${workbuddy_skills_root:-$workbuddy_home_dir/skills}"

assert_safe_root() {
  local root_path="$1"
  if [[ -z "$root_path" || "$root_path" == "/" || "$root_path" == "$user_home_dir" ]]; then
    echo "Refusing unsafe skills root: $root_path" >&2
    exit 2
  fi
}

assert_safe_root "$codex_skills_root"
assert_safe_root "$workbuddy_skills_root"

selected_hosts=()
case "$target_host" in
  codex) selected_hosts+=("Codex|$codex_skills_root") ;;
  workbuddy) selected_hosts+=("WorkBuddy|$workbuddy_skills_root") ;;
  both)
    selected_hosts+=("Codex|$codex_skills_root")
    selected_hosts+=("WorkBuddy|$workbuddy_skills_root")
    ;;
  auto)
    [[ -d "$codex_home_dir" ]] && selected_hosts+=("Codex|$codex_skills_root")
    [[ -d "$workbuddy_home_dir" ]] && selected_hosts+=("WorkBuddy|$workbuddy_skills_root")
    if [[ ${#selected_hosts[@]} -eq 0 ]]; then
      echo "No Codex or WorkBuddy home detected. Use --host or explicit roots." >&2
      exit 2
    fi
    ;;
esac

plans=()
change_count=0
echo "Opsy installer plan"
for host_entry in "${selected_hosts[@]}"; do
  host_name="${host_entry%%|*}"
  skills_root="${host_entry#*|}"
  target="$skills_root/opsy"
  if [[ "$target" == "$source_dir" ]]; then
    echo "Source and installation target are the same directory: $target" >&2
    exit 2
  fi
  current_version="none/unknown"
  [[ -f "$target/VERSION" ]] && current_version="$(tr -d '[:space:]' < "$target/VERSION")"
  action="install"
  if [[ -d "$target" ]]; then
    if [[ "$current_version" == "$source_version" && "$force_install" != "true" ]]; then
      action="up-to-date"
    else
      action="archive-and-install"
    fi
  fi
  [[ "$action" != "up-to-date" ]] && change_count=$((change_count + 1))
  plans+=("$host_name|$skills_root|$target|$current_version|$action")
  printf '  %-10s %-20s %s -> %s  %s\n' "$host_name" "$action" "$current_version" "$source_version" "$target"
done

if [[ $change_count -eq 0 ]]; then
  echo "Opsy $source_version is already installed for every selected host."
  exit 0
fi
if [[ "$dry_run" == "true" ]]; then
  echo "Dry run only; no files changed."
  exit 0
fi
if [[ "$assume_yes" != "true" ]]; then
  read -r -p "Proceed with the displayed installation plan? [y/N] " answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Cancelled; no files changed."; exit 1 ;; esac
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
for plan in "${plans[@]}"; do
  IFS='|' read -r host_name skills_root target current_version action <<< "$plan"
  [[ "$action" == "up-to-date" ]] && continue
  mkdir -p "$skills_root"
  if [[ -d "$target" ]]; then
    backup_root="$skills_root/.opsy-backups"
    backup_path="$backup_root/opsy-$current_version-$timestamp"
    mkdir -p "$backup_root"
    [[ -e "$backup_path" ]] && { echo "Backup target exists: $backup_path" >&2; exit 2; }
    mv "$target" "$backup_path"
    echo "Archived $host_name installation to $backup_path"
  fi
  cp -R "$source_dir" "$target"
  verified_version="$(tr -d '[:space:]' < "$target/VERSION")"
  [[ "$verified_version" == "$source_version" ]] || { echo "Verification failed for $host_name" >&2; exit 2; }
  echo "Installed Opsy $source_version for $host_name: $target"
done

echo "Installation complete. Customer workspaces were not modified."
