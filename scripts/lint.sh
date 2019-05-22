#!/bin/bash

tput setaf 14;
printf "\n Linting Typescript files...\n\n";
tput sgr0;

find website server -name "*.ts" -type f -exec echo Linting '{}'... \; -exec eslint {} --fix \;
