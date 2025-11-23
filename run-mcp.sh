#!/bin/bash

# Wrapper script to run MCP server from project root
# This ensures all paths are resolved relative to the project root
# and TypeScript path aliases work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Change to project root (where this script is located)
# This allows tsx to find tsconfig.json and resolve path aliases
cd "$SCRIPT_DIR" || exit 1

# Use yarn if available (recommended), otherwise use npx
# Using yarn will use the project root's node_modules
# tsx automatically resolves tsconfig.json paths when run from project root
if command -v yarn &> /dev/null; then
  # Using yarn will use the project root's node_modules
  exec yarn tsx servers/mcp/index.ts
else
  # When using npx, explicitly specify the project root's tsconfig.json
  # tsx can specify tsconfig.json using the --tsconfig option
  exec npx -y tsx --tsconfig "$SCRIPT_DIR/tsconfig.json" servers/mcp/index.ts
fi

