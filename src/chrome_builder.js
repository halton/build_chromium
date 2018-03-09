'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

class ChromeBuilder {
	constructor(commander) {
		this.commander = commander;

		this.hostOs = getHostOs();
		this.hostCpu = getHostCpu();
		this.targetOs = commander.targetOs ? commander.targetOs : this.hostOs;
		this.targetCpu = commander.targetCpu ? commander.targetCpu : this.hostCpu;
		this.buildType = commander.buildType;

		this.rootDir = path.resolve(this.commander.args[0]);
		this.outDir = path.join(this.rootDir, 'out',
														this.targetOs + '_' + this.targetCpu + '_' + this.buildType);
	}

	validateOptions() {
		try {
			fs.accessSync(this.rootDir);
			fs.accessSync(path.resolve(this.rootDir, 'chrome', 'VERSION'));
		} catch (e) {
			console.log('Invalid chrome source dir: ' + this.rootDir);
			return false;
		}

		return true;
	}
}

// Get host OS
function getHostOs() {
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
function getHostCpu() {
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

module.exports = {
	ChromeBuilder
}