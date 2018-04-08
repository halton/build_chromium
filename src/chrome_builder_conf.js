// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const winston = require('winston');

/**
 * Chrome builder configuration class.
 */
class ChromeBuilderConf {
  /**
   * @param {string} rootDir Chromium source code directory.
   * @param {string} conf builder configuration file.
   */
  constructor(rootDir, conf) {
    this.conf_ = conf;
    this.rootDir_ = path.resolve(rootDir);
    this.outDir_ = undefined;

    // Get list via "gn help target_os <out_dir>", current support
    // android|chromeos|linux|nacl|mac|win
    this.targetOs_ = undefined;

    // Get list via "gn help target_cpu <out_dir>", current support
    // x86|x64|arm|arm64|mipsel
    this.targetCpu_ = undefined;

    // gn-args
    this.gnArgs_ = {
      isDebug: false,
      isComponent: false,
      extraGnArgs: undefined,
    };

    // logging
    this.logFile_ = undefined;
    this.logLevel_ = undefined;
    this.logger_ = undefined;

    // archive-server
    this.archiveServer_ = {
      host: undefined,
      dir: undefined,
      sshUser: undefined,
    };
  }

  /**
   * Initialization
   * @return {boolean} whether the configuration file is valid.
   */
  init() {
    fs.accessSync(this.rootDir_);
    fs.accessSync(path.resolve(this.rootDir_, 'chrome', 'VERSION'));

    let conf = JSON.parse(fs.readFileSync(this.conf_, 'utf8'));

    /* jshint ignore:start */
    this.targetOs_ = conf['target-os'];
    this.targetCpu_ = conf['target-cpu'];
    this.targetOs_ = this.targetOs_ || this.getHostOs();
    this.targetCpu_ = this.targetCpu_ || this.getHostCpu();

    this.gnArgs_.isDebug = conf['gnArgs']['is-debug'];
    this.gnArgs_.isComponent = conf['gnArgs']['is-component'];
    this.gnArgs_.extra = conf['gnArgs']['extra'];
    this.outDir_ = path.join(this.rootDir_, 'out',
                             this.targetOs_ + '_' + this.targetCpu_ + '_' +
                             (this.gnArgs_.isDebug ? 'debug' : 'release'));

    this.archiveServer_.host = conf['archive-server']['host'];
    this.archiveServer_.dir = conf['archive-server']['dir'];
    this.archiveServer_.sshUser = conf['archive-server']['ssh-user'];
    // Handel logger
    this.logLevel_ = conf['logging']['level'] || 'info';
    this.today_ = new Date().toISOString().substring(0, 10);
    this.logFile_ = conf['logging']['file'] ||
        path.join(os.tmpdir(),
        'chromium_' + this.targetOs_ + '_' + this.targetCpu_ + '_' +
        this.today_ + '.log');
    /* jshint ignore:end */

    this.logger_ = winston.createLogger({
      level: this.logLevel_,
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console({
          colorize: true,
        }),
        new winston.transports.File({
          filename: this.logFile_,
       }),
      ],
    });

    // FIXME(halton): create logfile is does not exist
    fs.writeFileSync(this.logFile_, '', {flag: 'w+'});

    this.logger_.debug('root dir: ' + this.rootDir_);
    this.logger_.debug('out dir: ' + this.outDir_);
    this.logger_.debug('target OS: ' + this.targetOs_);
    this.logger_.debug('target CPU: ' + this.targetCpu_);
    this.logger_.debug('log level: ' + this.logLevel_);
    this.logger_.debug('log file: ' + this.logFile_);
    this.logger_.debug('archive host: ' + this.archiveServer_.host);
    this.logger_.debug('archive dir: ' + this.archiveServer_.dir);
    this.logger_.debug('archive ssh user: ' + this.archiveServer_.sshUser);

    return true;
  }

  /**
   * @return {string} configuration file.
   */
  get confFile() {
    return this.conf_;
  }

  /**
   * @return {string} root dir.
   */
  get rootDir() {
    return this.rootDir_;
  }

  /**
   * @return {string} out dir.
   */
  get outDir() {
    return this.outDir_;
  }

  /**
   * @return {string} target OS.
   */
  get targetOs() {
    return this.targetOs_;
  }

  /**
   * @return {string} target CPU.
   */
  get targetCpu() {
    return this.targetCpu_;
  }

  /**
   * @return {string} arguments to run 'gn gen'.
   */
  get gnArgs() {
    let args = 'target_os=\"' + this.targetOs + '\"';
    args += ' target_cpu=\"' + this.targetCpu + '\"';
    args += ' is_debug=' + (this.gnArgs_.isDebug).toString();
    args += ' is_component_build=' + (this.gnArgs_.isComponent).toString();
    if (this.gnArgs_.extra) this.gnArgs_ += ' ' + (this.gnArgs_.extra);

    return args;
  }

  /**
   * @return {string} of today.
   */
  get today() {
    return this.today_;
  }

  /**
   * @return {string} of build target.
   */
  get buildTarget() {
    switch (this.targetOs) {
      case 'android':
        return 'chrome_public_apk';
      case 'linux':
        return 'unstable_deb';
      case 'mac':
        return 'mac_installer_app';
      default:
        return null;
    }
  }

  /**
   * @return {string} path of package file.
   */
  get packagedFile() {
    let installer = null;
    switch (this.targetOs) {
      case 'android':
        return path.join(this.outDir_, 'apks', 'ChromePublic.apk');
      case 'linux':
        // TODO(halton): Run gn desc <out_dir> //chrome/installer/linux:unstable_deb outputs
        // to get below string
        installer = '//out/linux_x64_release/chromium-browser-unstable_65.0.3324.0-1_amd64.deb';
        return path.join(this.outDir_, installer.split('/')[4]);
      case 'mac':
        // TODO(halton): Run gn desc <out_dir> //chrome/installer/mac/app:mac_installer_app outputs
        // to get below string output //out/mac_x64_release/Chromium Installer.app,
        // then use hdiutil to create a dmg
        installer = 'Chromium.dmg';
        spawnSync('hdiutil',
                  ['create', '-fs', 'HFS+',
                   '-srcfolder', 'Chromium Installer.app',
                   '-volname', 'Chromium',
                   installer],
                  {cwd: this.outDir});
        return path.join(this.outDir_, installer);
      default:
        return null;
    }
  }

  /**
   * @return {object} logger.
   */
  get logger() {
    return this.logger_;
  }

  /**
   * @return {string} log file.
   */
  get logFile() {
    return this.logFile_;
  }

  /**
   * @return {string} log level.
   */
  get logLevel() {
    return this.logLevel_;
  }

  /**
   * @return {object} logger.
   */
  get archiveServer() {
    return this.archiveServer_;
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
        this.logger_.error(`Unsuppurted arch: ${hostCpu}`);
    }

    return hostCpu;
  }
}

module.exports = {
  ChromeBuilderConf,
};
