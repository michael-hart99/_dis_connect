#!/bin/bash

tput setaf 14;
printf "\n Starting server...\n\n";
tput sgr0;

sudo ./node_modules/.bin/ts-node-dev --respawn --transpileOnly ./server/server.ts
