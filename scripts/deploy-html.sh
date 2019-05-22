#!/bin/bash

tput setaf 14;
printf "\n Deploying HTML files...\n\n";
tput sgr0;

CP='sudo cp -v';

WEBFILES_PATH=./website;

PATH_TO_SITE=/var/www/thejobdance.com/html;

$CP ./website/controller/index.html   $PATH_TO_SITE/controller/ &&
$CP ./website/preshowvideo/index.html $PATH_TO_SITE/preshowvideo/ &&
$CP ./website/projector/index.html    $PATH_TO_SITE/projector/ &&
$CP ./website/streamHost/index.html   $PATH_TO_SITE/streamHost/;
