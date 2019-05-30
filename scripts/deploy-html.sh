#!/bin/bash

source $(dirname $0)/script_info.sh;

info_msg "Deploying HTML files...";

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
    auth_cp $WEBFILES_PATH/$PAGE/index.html   $PATH_TO_SITE/$PAGE/index.html;
    if [ $? -ne 0 ]; then exit 1; fi;
done

auth_cp $WEBFILES_PATH/styles.css $PATH_TO_SITE/styles.css;
