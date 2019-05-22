#!/bin/bash

tput setaf 14;
printf "\n Creating website directory structure...\n\n";
tput sgr0;

source $(dirname $0)/../script-info.sh;

for PAGE in controller preshowvideo projector streamHost
do
    sudo mkdir $PATH_TO_SITE/$PAGE 2>/dev/null;
done

exit 0;
