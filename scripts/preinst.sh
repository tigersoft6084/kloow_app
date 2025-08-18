#!/bin/bash
if ! command -v certutil &> /dev/null; then
  echo "  Error: libnss3-tools is not installed"
  echo "  The 'libnss3-tools' package is required for certificate support."
  echo "  Please install it using:"
  echo "    sudo apt update && sudo apt install libnss3-tools"
  echo "  Then retry the installation."
  exit 1
fi
