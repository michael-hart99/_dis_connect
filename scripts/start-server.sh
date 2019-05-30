#!/bin/bash

info_msg "Starting server...";

sudo ./node_modules/.bin/ts-node-dev --respawn --transpileOnly ./server/server.ts
