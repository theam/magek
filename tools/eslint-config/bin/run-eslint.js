#!/usr/bin/env node
const { spawnSync } = require('child_process')
const eslintCli = require.resolve('eslint/bin/eslint.js')
const result = spawnSync(process.execPath, [eslintCli, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(result.status)