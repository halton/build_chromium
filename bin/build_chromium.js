#!/usr/bin/env node

// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const program = require('commander');
const {ChromeBuilder} = require('../src/chrome_builder');

program
  .version(require('../package.json').version)
  .usage('sub-command [options] <dir>')
  .option('-t, --build-type <buildType>', 'Build Type', /^(debug|release)$/i, 'release')
  // Get list via "gn help target_os <out_dir>"
  .option('--target-os <targetOs>', 'Target OS', /^(android|chromeos|linux|nacl|mac|win)$/i, null)
  // Get list via "gn help target_cpu <out_dir>"
  .option('--target-cpu <targetCpu>', 'Target CPU', /^(x86|x64|arm|arm64|mipsel)$/i, null)
  .option('--extra-gn-args <extraGnArgs>', 'Extra args when running GN')
  .option('--log-level <logLevel>', 'Logging level', /^(error|warn|info|verbose)$/i, 'verbose')
  .option('--upload-conf <uploadConf>', 'The upload configuration file', './.upload.conf')
  .parse(process.argv);

let builder = new ChromeBuilder(program.args[0],
                                program.args[1],
                                program.buildType,
                                program.targetOs,
                                program.targetCpu,
                                program.extraGnArgs,
                                program.logLevel,
                                program.uploadConf);

if (!builder.isSupportedSubCommand()) {
  console.log(`Unsupported sub-command ${builder.subCommand}`);
  process.exit(1);
}

if (!builder.validateRootDir()) {
  console.log(`Invalid chrome source dir: ${builder.rootDir}`);
  process.exit(1);
}

builder.run();
