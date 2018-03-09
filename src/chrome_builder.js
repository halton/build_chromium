'use strict';

const chdir = require('chdir');
const fs = require('fs');
const os = require('os');
const spawn = require('child_process').spawn;
const path = require('path');

class ChromeBuilder {
  constructor(subCommand, rootDir, targetOs, targetCpu, buildType) {
    this.supportedSubCommands = ['sync', 'config', 'build', 'package', 'upload'];

    this.subCommand = subCommand;
    this.rootDir = path.resolve(rootDir);
    this.buildType = buildType;

    this.hostOs = getHostOs();
    this.hostCpu = getHostCpu();
    this.targetOs = targetOs ? targetOs : this.hostOs;
    this.targetCpu = targetCpu ? targetCpu : this.hostCpu;

    this.outDir = path.join(this.rootDir, 'out',
                            this.targetOs + '_' + this.targetCpu + '_' + this.buildType);


    this.gnArgs = 'is_debug=' + (this.buildType == 'debug').toString();
  }

  isSupportedSubCommand() {
    return this.supportedSubCommands.includes(this.subCommand);
  }

  validateRootDir() {
    try {
      fs.accessSync(this.rootDir);
      fs.accessSync(path.resolve(this.rootDir, 'chrome', 'VERSION'));
    } catch (e) {
      return false;
    }

    return true;
  }

  run() {
    switch (this.subCommand) {
      case 'sync':
        this.gclientSync();
        break;
      case 'config':
        this.runGN();
        break;
      case 'build':
        this.ninjaBuild();
        break;
      case 'package':
        this.runPackage();
        break;
      case 'upload':
        this.runUpload();
        break;
    }
  }
  gclientSync() {
    execCommand('gclient', ['sync'], this.rootDir);
  }

  runGN() {
    execCommand('gn', ['gen', `--args=${this.gnArgs}`, this.outDir], this.rootDir);
  }

  ninjaBuild() {

  }

  runPackage() {

  }

  runUpload() {

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
      console.error(`Unsuppurted arch: ${program.targetCpu}`);
  }

  return hostCpu;
}

function execCommand(cmd, args, workingDir) {
  chdir(workingDir, () => {

    const cmdFullStr = cmd + ' ' + args.join(' ');
    const exec = spawn(cmd, [...args]);

    exec.stdout.on('data', (data) => {
      console.log(`${data}`);
    });

    exec.stderr.on('data', (data) => {
      console.log(`${data}`);
    });

    exec.on('close', (code) => {
      if (code !== 0)
        console.log(`\"${cmdFullStr}\" exited with code ${code}`);
    });

  });
}

module.exports = {
  ChromeBuilder
}
