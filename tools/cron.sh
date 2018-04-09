#!/bin/bash
#
# Usage: cron.sh .bot_config.json <path_to_chromium_src>

# for gclient tools
PATH="$HOME/chromium/depot_tools:$HOME/bin:$HOME/.local/bin:$PATH"
export NO_AUTH_BOTO_CONFIG=$HOME/.boto

# for node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

build_chromium -c $1 $2
