#!/bin/bash

tput setaf 14;
printf "\n Deploying HTML files...\n\n";
tput sgr0;

source $(dirname $0)/../script-info.sh;

for PAGE in $PAGES
do
    $CP $WEBFILES_PATH/$PAGE/index.html   $PATH_TO_SITE/$PAGE/;
    if [ $? -ne 0 ]; then exit 1; fi;
done

$CP $WEBFILES_PATH/styles.css $PATH_TO_SITE/streamHost/;
