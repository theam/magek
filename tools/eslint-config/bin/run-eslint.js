#!/usr/bin/env node
const { spawnSync } = require('child_process')
const path = require('path')
const eslintPkgPath = require.resolve('eslint/package.json')
const eslintCli = path.join(path.dirname(eslintPkgPath), 'bin', 'eslint.js')
const result = spawnSync(process.execPath, [eslintCli, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(result.status)