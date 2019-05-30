#!/bin/bash

source $(dirname $0)/script_info.sh;

info_msg "Deploying JavaScript files...";

for PAGE in $PAGES
do
    if [ ! -d $PATH_TO_SITE/$PAGE ]
    then
        # directory doesn't exist; create it
        if [ -w $PATH_TO_SITE ]
        then
            # current permissions are sufficient
            mkdir $PATH_TO_SITE/$PAGE
        else
            # need sudo permissions
            sudo mkdir $PATH_TO_SITE/$PAGE
        fi
    fi
    auth_cp $JS_DIR/$PAGE.js $PATH_TO_SITE/$PAGE/script.js;
    if [ $? -ne 0 ]; then exit 1; fi;
done
