#!/bin/bash

source $(dirname $0)/script_info.sh;

tsc --p ./tsconfig_server.jsonnet;
if [ $? -ne 0 ]; then exit 1; fi;

info_msg "Starting server...";

res="$(ts-node -P tsconfig_server.jsonnet ./server/testServer.ts 2>&1)";

if [ $? -ne 0 ]
then
    case $res in
        *"EACCES: permission denied"*)
            info_msg "Permission denied when accessing HTTPS certificates"
            info_msg "Starting server as root...";
            sudo ./node_modules/.bin/ts-node -T -P tsconfig_server.jsonnet ./server/server.ts
            ;;
        *)
            ts-node -T ./server/server.ts;
            ;;
    esac
else
    ts-node -T -P tsconfig_server.jsonnet ./server/server.ts;
fi
