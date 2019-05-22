#!/bin/bash

tput setaf 14;
printf "\n Compiling TypeScript into JavaScript...\n\n";
tput sgr0;

webpack;
