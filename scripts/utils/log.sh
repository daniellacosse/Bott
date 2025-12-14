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

# Logging functions matching application logger API
log_debug() {
  echo -e "${BLUE}DEBUG${NC} $1"
}

log_info() {
  echo -e "${GREEN}INFO${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}WARN${NC} $1"
}

log_error() {
  echo -e "${RED}ERROR${NC} $1"
}
