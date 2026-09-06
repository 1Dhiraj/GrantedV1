#!/usr/bin/env node
// The launcher is granted.mjs. This path stays so that installs, service
// definitions, CI jobs and scripts written before the rename keep working;
// importing rather than spawning keeps argv, stdio and the exit code intact.
import "./granted.mjs";
