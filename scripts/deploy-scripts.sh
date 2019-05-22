#!/bin/bash

tput setaf 14;
printf "\n Deploying JavaScript files...\n\n";
tput sgr0;

source $(dirname $0)/../script-info.sh;

for PAGE in controller preshowvideo projector streamHost
do
    $CP $JS_DIR/$PAGE.js $PATH_TO_SITE/$PAGE/script.js;
    if [ $? -ne 0 ]; then exit 1; fi;
done
