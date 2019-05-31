#!/bin/bash

source $(dirname $0)/script_info.sh;

info_msg "Starting server...";

res="$(ts-node -T ./server/server.ts 2>&1)";

if [ $? -ne 0 ]
then
    case $res in
        *"permission denied"*)
            info_msg "Permission denied when accessing HTTPS certificates"
            info_msg "Starting server as root...";
            sudo ./node_modules/.bin/ts-node -T ./server/server.ts
            ;;
        *"Unable to compile TypeScript"*)
            ts-node ./server/server.ts;
            exit 1
            ;;
        *)
            err_msg "Unknown error during TypeScript transpilation:"
            printf "$res\n"
            exit 1
            ;;
    esac
fi
