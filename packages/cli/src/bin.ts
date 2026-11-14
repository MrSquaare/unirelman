#!/usr/bin/env node

import { runCLI } from "./run";

await runCLI(process.argv.slice(2));
