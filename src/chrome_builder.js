// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const chdir = require('chdir');
const fs = require('fs');
const os = require('os');
const spawn = require('child_process').spawn;
const path = require('path');
const winston = require('winston');


/**
 * Chrome builder class.
 */
class ChromeBuilder {
  /**
   * @param {string} subCommand Sub command.
   * @param {string} rootDir Chromium source dir.
   * @param {string} targetOs Target OS.
   * @param {string} targetCpu Target CPU.
   * @param {string} buildType Build type.
   * @param {string} extraGnArgs Extra arguments when run 'gn gen'.
   * @param {string} logLevel Logging level.
   * @param {string} uploadConf Upload configuration file.
   */
  constructor(subCommand, rootDir,
              targetOs, targetCpu, buildType,
              extraGnArgs, logLevel,
              uploadConf) {
    this.supportedSubCommands = ['sync', 'config', 'build', 'package', 'upload'];

    this.subCommand = subCommand;
    this.rootDir = path.resolve(rootDir);
    this.buildType = buildType;

    this.hostOs = this.getHostOs();
    this.hostCpu = this.getHostCpu();
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
       }),
      ],
    });
  }

  /**
   * Check sub-command is supported or not.
   * @return {boolean} sub-command is supported.
   */
  isSupportedSubCommand() {
    return this.supportedSubCommands.includes(this.subCommand);
  }

  /**
   * Validate Chromium source dir.
   * @return {boolean} whether is Chromium source dir.
   */
  validateRootDir() {
    try {
      fs.accessSync(this.rootDir);
      fs.accessSync(path.resolve(this.rootDir, 'chrome', 'VERSION'));
    } catch (e) {
      return false;
    }

    return true;
  }

  /**
   * Run sub-command.
   */
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

  /**
   * Run 'sync' sub-command
   */
  gclientSync() {
    this.execCommand('gclient', ['sync'], this.rootDir);
  }

  /**
   * Run 'config' sub-command
   */
  runGN() {
    this.execCommand('gn', ['gen', `--args=${this.gnArgs}`, this.outDir], this.rootDir);
  }

  /**
   * Run 'build' sub-command
   */
  ninjaBuild() {
    let target = 'chrome';
    if (this.targetOs === 'android') {
      target = 'chrome_public_apk';
    }

    this.execCommand('ninja', ['-C', this.outDir, target], this.rootDir);
  }

  /**
   * Run 'package' sub-command
   */
  runPackage() {

  }

  /**
   * Run 'upload' sub-command
   */
  runUpload() {

  }

  /**
   * Execute command.
   * @param {string} cmd command string.
   * @param {array} args arguments array.
   * @param {string} workingDir working directory.
   */
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
        if (code != '0') {
          this.logger.error(outputStr);
        } else {
          this.logger.info(outputStr);
        }
      });
    });
  }

  /**
   * Get hosted OS string.
   * @return {string} hosted OS.
   */
  getHostOs() {
    let hostOs = os.platform();
    switch (hostOs) {
      case 'linux':
        return 'linux';
      case 'win32':
        return 'win';
      case 'darwin':
        return 'mac';
      case 'aix':
      case 'freebsd':
      case 'openbsd':
      case 'sunos':
        return 'linux';
    }
  }

  /**
   * Get hosted CPU string.
   * @return {string} hosted CPU.
   */
  getHostCpu() {
    let hostCpu = os.arch();
    switch (hostCpu) {
      case 'arm':
      case 'arm64':
      case 'mipsel':
      case 'x64':
        break;
      case 'ia32':
        hostCpu = 'x86';
        break;
      case 'mips':
      case 'ppc':
      case 'ppc64':
      case 's390':
      case 's390x':
      case 'x32':
        this.logger.error(`Unsuppurted arch: ${hostCpu}`);
    }

    return hostCpu;
  }
}

module.exports = {
  ChromeBuilder,
};
