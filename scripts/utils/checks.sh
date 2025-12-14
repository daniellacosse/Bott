#!/usr/bin/env bash
# @license
# This file is part of Bott.
#
# This project is dual-licensed:
# - Non-commercial use: AGPLv3 (see LICENSE file for full text).
# - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
#
# Copyright (C) 2025 DanielLaCos.se

# Dependency utility functions for Bott scripts

# Check if Homebrew is installed
check_homebrew() {
  if ! command -v brew &> /dev/null; then
    return 1
  fi
  return 0
}

# Check if gcloud is installed
check_gcloud() {
  if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
  fi
}
