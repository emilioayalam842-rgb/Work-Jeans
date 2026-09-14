#!/bin/zsh
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -d node_modules ] || npm install
echo "Abriendo Works Jeans en http://localhost:3001 ..."
(sleep 2; open http://localhost:3001) &
PORT=3001 node server.js
