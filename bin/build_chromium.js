'use strict';

let os = require('os');
let program = require('commander');

// Get host OS
function get_host_os () {
	let hostOs = os.platform();
	switch(hostOs) {
		case 'linux':
			break;
		case 'win32':
			program.targetOs = 'win';
			break;
		case 'darwin':
			program.targetOs = 'mac';
			break;
		case 'aix':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
			program.targetOs = 'linux';
			break;

	}
	return hostOs;
}

// Get Default ARCH
function get_host_cpu () {
	let hostCpu = os.arch();
	switch(hostCpu) {
		case 'arm':
		case 'arm64':
		case 'mipsel':
		case 'x64':
			break;
		case 'ia32':
			hostCpu = 'x86';
		case 'mips':
		case 'ppc':
		case 'ppc64':
		case 's390':
		case 's390x':
		case 'x32':
			console.error('Unsuppurted arch: %s', program.targetCpu);
	}

	return hostCpu;
}

program
	.version(require('../package.json').version)
	.usage('[options] <dir>')
	.option('--target-os <targetOs>', 'Target OS', /^(android|chromeos|linux|nacl|mac|win)$/i, null)
	.option('--target-cpu <targetCpu>', 'Target CPU', /^(x86|x64|arm|arm64|mipsel)$/i, null)
	.parse(process.argv);

if (program.targetOs === null) {
	program.targetOs = get_host_os();
}

if (program.targetCpu === null) {
	program.targetCpu = get_host_cpu();
}
