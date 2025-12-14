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
NC='\033[0m' # No Color

# Logger configuration
# Use process-specific log file to avoid race conditions between concurrent processes
# Default to STORAGE_ROOT/.output directory, scoped by ENV
ENV="${ENV:-production}"
STORAGE_ROOT="${FILE_SYSTEM_ROOT:-./fs_root}"
LOGGER_FILE="${LOGGER_FILE:-$STORAGE_ROOT/.output/logs/$ENV/script-$$.log}"
LOGGER_BUFFER=()
LOGGER_DEBOUNCE_SECONDS="${LOGGER_DEBOUNCE_SECONDS:-2}"
LOGGER_TOPICS="${LOGGER_TOPICS:-info,warn,error}"
LAST_FLUSH_TIME=0

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOGGER_FILE")"

# Flush log buffer to file
flush_logs() {
  if [ ${#LOGGER_BUFFER[@]} -gt 0 ]; then
    printf "%s\n" "${LOGGER_BUFFER[@]}" >> "$LOGGER_FILE"
    LOGGER_BUFFER=()
  fi
}

# Schedule flush after debounce period
schedule_flush() {
  local current_time=$(date +%s)
  local time_since_flush=$((current_time - LAST_FLUSH_TIME))
  
  if [ $time_since_flush -ge $LOGGER_DEBOUNCE_SECONDS ]; then
    flush_logs
    LAST_FLUSH_TIME=$current_time
  fi
}

# Trap to flush logs on exit
trap flush_logs EXIT

# Check if a log level is enabled
is_log_level_enabled() {
  local level="$1"
  echo ",$LOGGER_TOPICS," | grep -qi ",$level,"
}

# Base logging function that all other log functions call
# Usage: log "LEVEL" "color" "message parts..."
# Exported for performance logging
log() {
  local level="$1"
  local color="$2"
  shift 2
  local message="$*"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  
  # Check if this log level is enabled
  if ! is_log_level_enabled "$level"; then
    return 0
  fi
  
  # Output to console with color
  echo -e "${color}${level}${NC} ${message}"
  
  # Append to buffer without color codes
  LOGGER_BUFFER+=("${timestamp} ${level} ${message}")
  
  # Schedule flush
  schedule_flush
}

# Logging functions matching application logger API
# Usage: debug_log "message" or debug_log "message" "with" "multiple" "parts"

# DEBUG: Detailed diagnostic information for troubleshooting
debug_log() {
  log "DEBUG" "$BLUE" "$@"
}

# INFO: General informational messages about script progress
info_log() {
  log "INFO" "$GREEN" "$@"
}

# WARN: Warning messages about potential issues that don't prevent execution
warn_log() {
  log "WARN" "$YELLOW" "$@"
}

# ERROR: Error messages indicating failures that may stop execution
error_log() {
  log "ERROR" "$RED" "$@"
}

# Backward compatibility aliases
log_debug() { debug_log "$@"; }
log_info() { info_log "$@"; }
log_warn() { warn_log "$@"; }
log_error() { error_log "$@"; }
