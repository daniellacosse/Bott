#!/usr/bin/env bash
# @license
# This file is part of Bott.
#
# This project is dual-licensed:
# - Non-commercial use: AGPLv3 (see LICENSE file for full text).
# - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
#
# Copyright (C) 2025 DanielLaCos.se

# Logging utilities for Bott scripts
# Aligned with application logger levels (debug, info, warn, error)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CLEAR='\033[0m'

ENV="${ENV:-devcontainer}"
STORAGE_ROOT="${FILE_SYSTEM_ROOT:-./fs_root}"

LOGGER_FILE="${LOGGER_FILE:-$STORAGE_ROOT/.output/logs/$ENV/script-$$.log}"
LOGGER_BUFFER=()
LOGGER_DEBOUNCE_SECONDS="${LOGGER_DEBOUNCE_SECONDS:-2}"
LOGGER_TOPICS="${LOGGER_TOPICS:-info,warn,error}"

LAST_FLUSH_TIME=0

mkdir -p "$(dirname "$LOGGER_FILE")"

debug_log() {
  log "DEBUG" "$BLUE" "$@"
}

info_log() {
  log "INFO" "$GREEN" "$@"
}

warn_log() {
  log "WARN" "$YELLOW" "$@"
}

error_log() {
  log "ERROR" "$RED" "$@"
}

perf_log() {
  log "PERF" "$PURPLE" "$@"
}

log() {
  local level="$1"
  local color="$2"
  shift 2
  
  local message
  if [ $# -gt 0 ]; then
    message="$*"
  else
    # Read from stdin
    message=$(cat)
  fi
  
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  
  if ! is_log_level_enabled "$level"; then
    return 0
  fi
  
  if [ -n "$message" ]; then
    # 1. Append to file immediately
    printf "%s %s %s\n" "$timestamp" "$level" "$message" >> "$LOGGER_FILE"
    
    # 2. Add to memory (for buffered console flush)
    # Store as "COLOR LEVEL MESSAGE" for easy parsing in flush_logs
    LOGGER_BUFFER+=("$color $level $message")
    
    # 3. Schedule flush
    schedule_flush
  fi
}

is_log_level_enabled() {
  local level="$1"
  echo ",$LOGGER_TOPICS," | grep -qi ",$level,"
}

schedule_flush() {
  local current_time=$(date +%s)
  local time_since_flush=$((current_time - LAST_FLUSH_TIME))
  
  if [ $time_since_flush -ge $LOGGER_DEBOUNCE_SECONDS ]; then
    flush_logs
    LAST_FLUSH_TIME=$current_time
  fi
}

flush_logs() {
  if [ ${#LOGGER_BUFFER[@]} -gt 0 ]; then
    for entry in "${LOGGER_BUFFER[@]}"; do
      local color="${entry%% *}"
      local temp="${entry#* }"
      local level="${temp%% *}"
      local message="${temp#* }"
      
      # Send errors to stderr, others to stdout
      if [ "$level" = "ERROR" ]; then
        printf "${color}${level}${CLEAR} %s\n" "$message" >&2
      else
        printf "${color}${level}${CLEAR} %s\n" "$message"
      fi
    done
    LOGGER_BUFFER=()
  fi
}

# Flush logs on exit
trap flush_logs EXIT
