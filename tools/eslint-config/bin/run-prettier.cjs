#!/usr/bin/env node
const { spawnSync } = require('child_process')
const prettierCli = require.resolve('prettier/bin-prettier.js')
const result = spawnSync(process.execPath, [prettierCli, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(result.status)
