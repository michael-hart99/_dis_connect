#!/bin/bash

source $(dirname $0)/script_info.sh;

info_msg "Compiling TypeScript into JavaScript...";

tsc --p ./tsconfig_web.jsonnet &&
webpack;
