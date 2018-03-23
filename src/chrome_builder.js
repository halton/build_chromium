// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

/**
 * Chrome builder class.
 */
class ChromeBuilder {
  /**
   * @param {ChromeBuilderConf} conf configuration file.
   */
  constructor(conf) {
    this.conf_ = conf;
    this.supportedActions_ = ['sync', 'config', 'build', 'package', 'upload', 'all'];
  }

  /**
   * return {string} supported actions.
   */
  get supportedActions() {
    return this.supportedActions_.toString();
  }

  /**
   * Run command.
   * @param {string} action command.
   */
  async run(action) {
    this.conf_.logger.debug('Action: ' + action);
    switch (action) {
      case 'sync':
        this.actionSync();
        break;
      case 'config':
        this.actionGn();
        break;
      case 'build':
        this.actionBuild();
        break;
      case 'package':
        this.actionPackage();
        break;
      case 'upload':
        this.actionUpload();
        break;
      case 'all':
        await this.actionSync();
        await this.actionGn();
        await this.actionBuild();
        await this.actionPackage();
        await this.actionUpload();
        break;
      default:
        this.conf_.logger.error('Unsupported action %s', action);
        process.exit(1);
    }
  }

  /**
   * Run 'gclient sync' command
   */
  async actionSync() {
    this.conf_.logger.info('Action sync');
    await this.childCommand('gclient', ['sync']);
  }

  /**
   * Run 'gn gen' command
   */
  async actionGn() {
    this.conf_.logger.info('Action config');
    await this.childCommand('gn', ['gen', `--args=${this.conf_.gnArgs}`, this.conf_.outDir]);
  }

  /**
   * Run 'ninja -C' command
   */
  async actionBuild() {
    this.conf_.logger.info('Action build');

    let target = 'chrome';
    if (this.conf_.targetOs === 'android') {
      target = 'chrome_public_apk';
    }

    await this.childCommand('ninja', ['-C', this.conf_.outDir, target]);
  }

  /**
   * Run 'package' command
   */
  actionPackage() {
    this.conf_.logger.info('Action package');
  }

  /**
   * Run 'upload' command
   */
  async actionUpload() {
    this.conf_.logger.info('Action upload');

    if (!this.conf_.archiveServer.host ||
        !this.conf_.archiveServer.dir ||
        !this.conf_.archiveServer.sshUser) {
      this.conf_.logger.info('Insufficient archive-server given in ' + this.conf_.confFile);
      return;
    }

    try {
      fs.accessSync(this.conf_.packagedFile);
    } catch (e) {
      this.conf_.logger.error('Fail to access ' + this.conf_.packagedFile);
      return;
    }

    let remoteSshHost = this.conf_.archiveServer.sshUser + '@' + this.conf_.archiveServer.host;
    let remoteDir = path.join(this.conf_.archiveServer.dir, this.conf_.today,
                              this.conf_.targetOs + '_' + this.conf_.targetCpu);
    let remoteSshDir = remoteSshHost + ':' + remoteDir + '/';

    // create remote dir
    await this.childCommand('ssh', [remoteSshHost, 'mkdir', '-p', remoteDir]);

    // upload achive file and log file
    await this.childCommand('scp', [this.conf_.packagedFile, remoteSshDir]);

    await this.childCommand('scp', [this.conf_.logFile, remoteSshDir]);
  }

  /**
   * Execute command.
   * @param {string} cmd command string.
   * @param {array} args arguments array.
   * @return {object} child_process.spawn promise.
   */
  childCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const cmdFullStr = cmd + ' ' + args.join(' ');
      this.conf_.logger.info('Execute command: ' + cmdFullStr);

      const child = spawn(cmd, [...args], {cwd: this.conf_.rootDir});

      child.stdout.on('data', (data) => {
        this.conf_.logger.debug(data.toString());
      });

      child.stderr.on('data', (data) => {
        this.conf_.logger.error(data.toString());
        reject();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          this.conf_.logger.error('FAILED.');
          process.exit(1);
        }
        this.conf_.logger.info('SUCCEED.');
        resolve(code);
      });
    });
  }
}

module.exports = {
  ChromeBuilder,
};
