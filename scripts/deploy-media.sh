#!/bin/bash

# If given --if-missing then only missing media in destination will be deployed

source $(dirname $0)/script_info.sh;

if [ "$1" = "--if-missing" ]
then
    info_msg "Deploying media files (if outdated/missing)...";

    if [ ! -e $PATH_TO_SITE/$FAVICON ] ||
       [ $WEBFILES_PATH/$FAVICON -nt $PATH_TO_SITE/$FAVICON ]
    then
        auth_cp $WEBFILES_PATH/$FAVICON $PATH_TO_SITE/$FAVICON;
        if [ $? -ne 0 ]; then exit 1; fi;
    fi
    if [ ! -e $PATH_TO_SITE/preshowvideo/$VIDEO ]
       [ $WEBFILES_PATH/preshowvideo/$VIDEO -nt $PATH_TO_SITE/preshowvideo/$VIDEO ]
    then
        auth_cp $WEBFILES_PATH/preshowvideo/$VIDEO $PATH_TO_SITE/preshowvideo/$VIDEO;
        if [ $? -ne 0 ]; then exit 1; fi;
    fi
else
    info_msg "Deploying media files...";

    auth_cp $WEBFILES_PATH/$FAVICON $PATH_TO_SITE/$FAVICON &&
    auth_cp $WEBFILES_PATH/preshowvideo/$VIDEO $PATH_TO_SITE/preshowvideo/$VIDEO;
fi
