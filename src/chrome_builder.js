// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const chdir = require('chdir');
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
      this.conf_.logger.info('Execution start at ' + start.toString() +
                              '\n  Command: ' + cmdFullStr +
                              '\n  Working Dir: ' + workingDir +
                              '\n  Logging File: ' + this.conf_.logFile);

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
                          '\n  Exit code: ' + code.toString() + ' in ' + (stop - start) + ' ms';
        if (code != '0') {
          this.conf_.logger.error(outputStr);
        } else {
          this.conf_.logger.info(outputStr);
        }
      });
    });
  }
}

module.exports = {
  ChromeBuilder,
};
