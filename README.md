# Build Chromium

This command line interface enables you to build [Chromium](https://www.chromium.org/Home) from source easily.

## Installation

```sh
npm install -g build_chromium
```

After installing it, run `build_chromium --help` without arguments to see list of options.

### Run
1. Follow offical [Chromium Get the code](https://www.chromium.org/developers/how-tos/get-the-code)
2. Create a bot config file
For example to build an Android arm debug build, show debug info.
```
{
  "target-os": "android",
  "target-cpu": "arm",
  "gnArgs": {
    "is-debug": true,
    "is-component": false,
    "extra": ""
  },
  "logging": {
    "level": "debug",
    "file": ""
  },
  "archive-server": {
    "host": "",
    "dir": "",
    "ssh-user": ""
  }
}
```
3. Execute below command to run
```
build_chromium -c .bot_config.json <path_to_src>
```

### Help
```sh
$ ./bin/build_chromium --help

  Usage: build_chromium [options] <dir>

  Options:

    -V, --version         output the version number
    -a --action <action>  Action (default: all)
    -c, --conf <conf>     Configuration file (default: .bot_config.json)
    -h, --help            output usage information
```

##BKMs
### To support to upload via SSH
1. On your client, follow [Github SSH page](https://help.github.com/articles/connecting-to-github-with-ssh/) to generate SSH keys and add to ssh-agent. (If you've done that, ignore)
2. On upload server, config [Authorized keys](https://www.ssh.com/ssh/authorized_keys/) with above client public keys.

## Contributing

Welcome all kinds of contributions including reporting issues, submit pull requests. Just follow [pull request](https://help.github.com/articles/creating-a-pull-request/) with this Github [repo](https://github.com/halton/build_chromium).

### Coding style

We're following the [Google JavaScript coding style](https://google.github.io/styleguide/jsguide.html) in general. And there is pre-commit checking `tools/linter.js` to ensure styling before commit code.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE.md](LICENSE.md) file for details
