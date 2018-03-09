'use strict';

const program = require('commander');
const { ChromeBuilder } = require('../src/chrome_builder');

program
	.version(require('../package.json').version)
	.usage('sub-command [options] <dir>')
	.option('-t, --build-type <buildType>', 'Build Type', /^(debug|release)$/i, 'release')
	// Get list via "gn help target_os <out_dir>"
	.option('--target-os <targetOs>', 'Target OS', /^(android|chromeos|linux|nacl|mac|win)$/i, null)
	// Get list via "gn help target_cpu <out_dir>"
	.option('--target-cpu <targetCpu>', 'Target CPU', /^(x86|x64|arm|arm64|mipsel)$/i, null)
	.option('--root-dir <rootDir>', 'Chromium source code directory', process.cwd())
	.parse(process.argv);

let builder = new ChromeBuilder(program.args[0],
																program.args[1],
																program.buildType,
																program.targetOs,
																program.targetCpu);

if (!builder.isSupportedSubCommand()) {
	console.log(`Unsupported sub-command ${builder.subCommand}`);
	process.exit(1);
}

if (!builder.validateRootDir()) {
	console.log(`Invalid chrome source dir: ${builder.rootDir}`);
	process.exit(1);
}

builder.run();
