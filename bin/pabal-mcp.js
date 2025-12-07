#!/usr/bin/env node

// CLI entrypoint that starts the MCP server (npx entry)
import { startServer } from "../dist/src/index.js";

await startServer();
