// .mocharc.cjs
module.exports = {
  extension: ['ts'],                     // treat *.ts as test files
  spec: 'test/**/*.test.ts',
  loader: 'ts-node/esm',                 // primary loader (CLI --loader)
  nodeOption: [
    'loader=ts-node/esm',                // ensures child‑process inherits
    'experimental-specifier-resolution=node' // optional: allow extension‑less imports
  ],
  timeout: 10000,
  parallel: false,                        // Node 22 handles worker threads well
  watchFiles: ['src/**/*.ts', 'test/**/*.ts'],
  forbidOnly: true,
  color: true,
  bail: true,
  fullTrace: true,
  diff: true
};