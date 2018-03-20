// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const chdir = require('chdir');
const fs = require('fs');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

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
  run(action) {
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
        this.actionSync();
        this.actionGn();
        this.actionBuild();
        this.actionPackage();
        this.actionUpload();
        break;
      default:
        this.conf_.logger.error('Unsupported action %s', action);
    }
  }

  /**
   * Run 'gclient sync' command
   */
  actionSync() {
    this.execCommand('gclient', ['sync'], this.conf_.rootDir);
  }

  /**
   * Run 'gn gen' command
   */
  actionGn() {
    this.execCommand('gn',
                     ['gen', `--args=${this.conf_.gnArgs}`, this.conf_.outDir],
                     this.conf_.rootDir);
  }

  /**
   * Run 'ninja -C' command
   */
  actionBuild() {
    let target = 'chrome';
    if (this.conf_.targetOs === 'android') {
      target = 'chrome_public_apk';
    }

    this.execCommand('ninja', ['-C', this.conf_.outDir, target], this.conf_.rootDir);
  }

  /**
   * Run 'package' command
   */
  actionPackage() {

  }

  /**
   * Run 'upload' command
   */
  actionUpload() {
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
    this.conf_.logger.debug('Creat remote SSH Dir: ' + remoteSshDir);
    let mkdir = spawnSync('ssh', [remoteSshHost, 'mkdir', '-p', remoteDir]);
    if (mkdir.status != 0 ) {
      this.conf_.logger.error(mkdir.error);
      return;
    }

    // upload achive file and log file
    this.execCommand('scp',
                     [
                      this.conf_.packagedFile,
                      remoteSshDir,
                     ],
                     this.conf_.rootDir);
    this.execCommand('scp',
                     [
                      this.conf_.logFile,
                      remoteSshDir,
                     ],
                     this.conf_.rootDir);

    // update latest link
    this.execCommand('ssh',
                     [
                      remoteSshHost,
                      'cd', remoteDir + '/..;',
                      'rm', 'latest;',
                      'ln', '-s', this.conf_.today, 'latest',
                     ],
                     this.conf_.rootDir);
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

      const exec = spawn(cmd, [...args]);

      exec.stdout.on('data', (data) => {
        this.conf_.logger.info(data.toString());
      });

      exec.stderr.on('data', (data) => {
        this.conf_.logger.error(data.toString());
      });

      exec.on('close', (code) => {
        const stop = new Date();
        const outputStr = 'Execution stop at ' + stop.toString() +
                          '\n  Command: ' + cmdFullStr +
                          '\n  Working Dir: ' + workingDir +
                          '\n  Logging File: ' + this.conf_.logFile +
                          '\n  Exit code: ' + code.toString() + ' in ' + (stop - start) + ' ms';
        if (code != '0') {
          this.conf_.logger.error(outputStr);
        } else {
          this.conf_.logger.debug(outputStr);
        }
      });
    });
  }
}

module.exports = {
  ChromeBuilder,
};
