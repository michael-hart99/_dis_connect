#!/bin/bash

tput setaf 14;
printf "\n Deploying media files...\n\n";
tput sgr0;

CP='sudo cp -v';

WEBFILES_PATH=./website;

FAVICON=favicon.ico;
VIDEO=preshowvideo/pre-show_video.mov;

PATH_TO_SITE=/var/www/thejobdance.com/html;

$CP $WEBFILES_PATH/$FAVICON $PATH_TO_SITE/ &&
$CP $WEBFILES_PATH/$VIDEO $PATH_TO_SITE/$VIDEO;
