'use strict';

const chdir = require('chdir');
const fs = require('fs');
const os = require('os');
const spawn = require('child_process').spawn;
const path = require('path');
const winston = require('winston');

class ChromeBuilder {
  constructor(subCommand, rootDir,
              targetOs, targetCpu, buildType,
              extraGnArgs, logLevel,
              uploadConf) {
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
    if (extraGnArgs) this.gnArgs += ' ' + extraGnArgs;

    // Handel logger
    const logFilename = new Date().toISOString().substring(0, 10);
    this.logFile = path.join(os.tmpdir(), 'chromium-' + logFilename + '.log');

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console({
          colorize: true,
        }),
        new winston.transports.File({
          filename: this.logFile,
       })
      ]
    });
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
    this.execCommand('gclient', ['sync'], this.rootDir);
  }

  runGN() {
    this.execCommand('gn', ['gen', `--args=${this.gnArgs}`, this.outDir], this.rootDir);
  }

  ninjaBuild() {
    let target = 'chrome';
    if (this.targetOs === 'android')
      target = 'chrome_public_apk';

    this.execCommand('ninja', ['-C', this.outDir, target], this.rootDir);
  }

  runPackage() {

  }

  runUpload() {

  }

  execCommand(cmd, args, workingDir) {
    chdir(workingDir, () => {

      const cmdFullStr = cmd + ' ' + args.join(' ');
      const start = new Date();
      this.logger.info('Execution start at ' + start.toString() +
                       '\n  Command: ' + cmdFullStr +
                       '\n  Working Dir: ' + workingDir +
                       '\n  Logging File: ' + this.logFile);

      const exec = spawn(cmd, [...args]);

      exec.stdout.on('data', (data) => {
        this.logger.info(data.toString());
      });

      exec.stderr.on('data', (data) => {
        this.logger.error(data.toString());
      });

      exec.on('close', (code) => {
        const stop = new Date();
        const outputStr = 'Execution stop at ' + stop.toString() +
                          '\n  Exit code: ' + code.toString() + ' in ' + (stop - start) + ' ms';
        (code != '0') ? this.logger.error(outputStr) : this.logger.info(outputStr);
      });

    });
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
      this.logger.error(`Unsuppurted arch: ${program.targetCpu}`);
  }

  return hostCpu;
}


module.exports = {
  ChromeBuilder
}
