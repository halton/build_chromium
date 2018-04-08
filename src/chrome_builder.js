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

    // Get last sucessful changeset
    this.lastSucceedChangesetFile_ = path.join(this.conf_.outDir, 'SUCCEED');
    this.lastSucceedChangeset_ = null;
    this.latestChangeset_ = null;
    try {
      this.lastSucceedChangeset_ = fs.readFileSync(this.lastSucceedChangesetFile_, 'utf8');
      this.conf_.logger.debug(`Last sucessful build changeset is ${this.lastSucceedChangeset_}`);
    } catch (e) {
      this.conf_.logger.info('Not found last sucessful build.');
    }

    this.childResult_ = {};

    // Upload server
    this.remoteSshHost_ = null;
    this.remoteDir_ = null;
    this.remoteSshDir_ = null;

    if (!this.conf_.archiveServer.host ||
        !this.conf_.archiveServer.dir ||
        !this.conf_.archiveServer.sshUser) {
      this.conf_.logger.info('Insufficient archive-server given in ' + this.conf_.confFile);
      return;
    }

    this.remoteSshHost_ = this.conf_.archiveServer.sshUser + '@' + this.conf_.archiveServer.host;
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
    await this.updateChangeset();

    // skip if sync action is not include and changesets are same
    if ((action !== 'sync' || action !== 'all') &&
        (this.lastSucceedChangeset_ === this.latestChangeset_)) {
      this.conf_.logger.info('No change since last sucessful build, skip this time.');
      return;
    }

    switch (action) {
      case 'sync':
        await this.actionSync();
        await this.updateChangeset();
        break;
      case 'config':
        await this.actionGn();
        break;
      case 'build':
        await this.actionBuild();
        break;
      case 'package':
        await this.actionPackage();
        break;
      case 'upload':
        await this.actionUpload();
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

    if (!this.childResult_.success) {
      await this.uploadLogfile();
      process.exit(1);
    }
  }

  /**
   * Run 'gn gen' command
   */
  async actionGn() {
    this.conf_.logger.info('Action config');
    await this.childCommand('gn', ['gen', `--args=${this.conf_.gnArgs}`, this.conf_.outDir]);

    if (!this.childResult_.success) {
      await this.uploadLogfile();
      process.exit(1);
    }
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

    // Remove SUCCESS file if changeset different
    // this.conf_.logger.info(this.lastSucceedChangeset_);
    // this.conf_.logger.info(this.latestChangeset_);
    if (this.lastSucceedChangeset_ !== this.latestChangeset_) {
      try {
        fs.unlinkSync(this.lastSucceedChangesetFile_);
        this.lastSucceedChangeset_ = null;
      } catch (e) {
        this.conf_.logger.error(e);
      }
    }

    await this.childCommand('ninja', ['-C', this.conf_.outDir, target]);
    if (!this.childResult_.success) {
      await this.uploadLogfile();
      process.exit(1);
    } else {
      fs.writeFileSync(this.lastSucceedChangesetFile_, this.latestChangeset_);
    }
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
    if (!this.remoteSshHost_) return;

    if (this.lastSucceedChangeset_ === this.latestChangeset_) {
      this.conf_.logger.info('No change since last sucessful build, skip this time.');
      return;
    }

    try {
      fs.accessSync(this.conf_.packagedFile);
    } catch (e) {
      this.conf_.logger.error('Fail to access ' + this.conf_.packagedFile);
      return;
    }
    await this.makeRemoteDir();
    await this.childCommand('scp', [this.conf_.packagedFile, this.remoteSshDir_]);
    await this.uploadLogfile();
  }

  /**
   * Get latest changeset
   */
  async updateChangeset() {
    let obj = {};
    await this.childCommand('git', ['rev-parse', 'HEAD'], obj);
    this.latestChangeset_ = obj.changeset;
    this.conf_.logger.info(`HEAD is at ${this.latestChangeset_}`);
  }

  /**
   * Create remote directory
   */
  async makeRemoteDir() {
    if (!this.remoteSshHost_) return;

    this.remoteDir_ = path.join(this.conf_.archiveServer.dir,
                                this.conf_.today + '_' + this.latestChangeset_.substring(0, 7),
                                this.conf_.targetOs + '_' + this.conf_.targetCpu);
    let success = false;
    try {
      fs.accessSync(this.lastSucceedChangesetFile_);
      success = true;
    } catch (e) {
      success = false;
    }
    this.remoteDir_ += success ? '_SUCCEED': '_FAILED';
    this.remoteSshDir_ = this.remoteSshHost_ + ':' + this.remoteDir_ + '/';

    await this.childCommand('ssh', [this.remoteSshHost_, 'mkdir', '-p', this.remoteDir_]);
  }

  /**
   * Upload log file
   */
  async uploadLogfile() {
    if (!this.remoteSshHost_) return;

    await this.makeRemoteDir();
    await this.childCommand('scp', [this.conf_.logFile, this.remoteSshDir_]);
  }

  /**
   * Execute command.
   * @param {string} cmd command string.
   * @param {array} args arguments array.
   * @param {object} result return value.
   * @return {object} child_process.spawn promise.
   */
  childCommand(cmd, args, result) {
    return new Promise((resolve, reject) => {
      const cmdFullStr = cmd + ' ' + args.join(' ');
      this.conf_.logger.info('Execute command: ' + cmdFullStr);

      const child = spawn(cmd, [...args], {cwd: this.conf_.rootDir});

      child.stdout.on('data', (data) => {
        if (result) result.changeset = data.toString();
        this.conf_.logger.debug(`${data.toString()}`);
      });

      child.stderr.on('data', (data) => {
        this.conf_.logger.error(data.toString());
        reject();
      });

      child.on('close', (code) => {
        this.childResult_.success = (code === 0);
        resolve(code);
      });
    });
  }
}

module.exports = {
  ChromeBuilder,
};
