# THIS IS A SOURCE FOR THE scripts/ DIRECTORY

source $(dirname $0)/../project_info.sh;

# The file structure of the project
JS_DIR=./dist;
WEBFILES_PATH=./website;
PAGES='controller preshowvideo projector streamHost';

# Print an info message to stdout
info_msg() {
    printf "\x1b[38;5;14m"
    printf "\n[INFO] $1\n\n"
    printf "\x1b[0m"
}

# Print an error message to stdout (not stderr)
err_msg() {
    printf "\x1b[31;1m"
    printf "\n[ERROR] $1\n\n"
    printf "\x1b[0m"
}

# Copy the first file to the second file/directory. If the current permissions
#   are insufficient, run 'sudo'.
#
# $1 = source
# $2 = dest
auth_cp() {
    local SUDO=0
    if [ -e $1 ]
    then
        # source exists
        if [ ! -r $1 ]
        then
            # source lacks permission
            SUDO=1
        fi
    else
        # source doesn't exist
        err_msg "File $1 is not readable"
        return 1
    fi

    if [ -d $2 ]
    then
        # dest is a directory
        if [ ! -w $2 ]
        then
            # dest lacks permission
            SUDO=1
        fi
    else
        # dest is a file
        if [ ! -w "$(dirname $2)" ]
        then
            # dest directory lacks permission
            SUDO=1
        else
            if [ -e $2 ] &&
               [ ! -w $2 ]
            then
                # dest file lacks permission
                SUDO=1
            fi
        fi
    fi

    if [ $SUDO -eq 1 ]
    then
        # sudo permissions are required
        echo "$1 -> $2"
        sudo cp -v $1 $2
        return $?
    else
        # current permissions are sufficient
        cp -v $1 $2
        return $?
    fi
}
