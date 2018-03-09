'use strict';

const program = require('commander');
const {ChromeBuilder} = require('../src/chrome_builder');

program
	.version(require('../package.json').version)
	.usage('[options] <dir>')
	.option('-t, --build-type <type>', 'Build Type', /^(debug|release)$/i, 'release')
	// Get list via "gn help target_os <out_dir>"
	.option('--target-os <targetOs>', 'Target OS', /^(android|chromeos|linux|nacl|mac|win)$/i, null)
	// Get list via "gn help target_cpu <out_dir>"
	.option('--target-cpu <targetCpu>', 'Target CPU', /^(x86|x64|arm|arm64|mipsel)$/i, null)
	.parse(process.argv);

let builder = new ChromeBuilder(program);

if (!builder.validateOptions()) process.exit(1);

console.log(builder.targetOs);
console.log(builder.targetCpu);
console.log(builder.rootDir);
console.log(builder.outDir);
