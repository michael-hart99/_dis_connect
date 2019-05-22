#!/bin/bash

tput setaf 14;
printf "\n Deploying media files...\n\n";
tput sgr0;

source $(dirname $0)/../script-info.sh;

$CP $WEBFILES_PATH/$FAVICON $PATH_TO_SITE/ &&
$CP $WEBFILES_PATH/preshowvideo/$VIDEO $PATH_TO_SITE/preshowvideo/$VIDEO;
