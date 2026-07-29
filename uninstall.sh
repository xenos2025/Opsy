#!/usr/bin/env bash

set -euo pipefail

target_host="auto"
codex_skills_root=""
workbuddy_skills_root=""
assume_yes="false"
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) target_host="${2:?missing value for --host}"; shift 2 ;;
    --codex-root) codex_skills_root="${2:?missing value for --codex-root}"; shift 2 ;;
    --workbuddy-root) workbuddy_skills_root="${2:?missing value for --workbuddy-root}"; shift 2 ;;
    --yes) assume_yes="true"; shift ;;
    --dry-run) dry_run="true"; shift ;;
    --help|-h)
      echo "Usage: ./uninstall.sh [--host auto|codex|workbuddy|both] [--yes] [--dry-run]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$target_host" in auto|codex|workbuddy|both) ;; *) echo "Invalid --host" >&2; exit 2 ;; esac

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
    [[ -d "$codex_skills_root/opsy" ]] && selected_hosts+=("Codex|$codex_skills_root")
    [[ -d "$workbuddy_skills_root/opsy" ]] && selected_hosts+=("WorkBuddy|$workbuddy_skills_root")
    ;;
esac

targets=()
echo "Opsy uninstall plan (recoverable archive)"
for host_entry in "${selected_hosts[@]}"; do
  host_name="${host_entry%%|*}"
  skills_root="${host_entry#*|}"
  target="$skills_root/opsy"
  if [[ -d "$target" ]]; then
    targets+=("$host_name|$skills_root|$target")
    printf '  %-10s %s\n' "$host_name" "$target"
  fi
done

if [[ ${#targets[@]} -eq 0 ]]; then
  echo "No selected Opsy installation found. Customer workspaces were not inspected."
  exit 0
fi
if [[ "$dry_run" == "true" ]]; then
  echo "Dry run only; no files changed."
  exit 0
fi
if [[ "$assume_yes" != "true" ]]; then
  read -r -p "Archive the displayed Opsy installations? [y/N] " answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Cancelled; no files changed."; exit 1 ;; esac
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
for target_entry in "${targets[@]}"; do
  IFS='|' read -r host_name skills_root target <<< "$target_entry"
  backup_root="$skills_root/.opsy-backups"
  backup_path="$backup_root/opsy-uninstalled-$timestamp"
  mkdir -p "$backup_root"
  [[ -e "$backup_path" ]] && { echo "Backup target exists: $backup_path" >&2; exit 2; }
  mv "$target" "$backup_path"
  echo "Archived $host_name Opsy installation to $backup_path"
done

echo "Uninstall complete. Customer workspaces were not inspected or modified."
