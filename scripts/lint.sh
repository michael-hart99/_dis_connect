#!/bin/bash

source $(dirname $0)/script_info.sh;

info_msg "Linting Typescript files...";

find website server ProjectInfo.ts -name "*.ts" -type f \
    -exec echo Linting '{}'... \; \
    -exec eslint {} --fix \;
