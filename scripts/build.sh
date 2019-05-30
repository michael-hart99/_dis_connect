#!/bin/bash

source $(dirname $0)/script_info.sh;

$(dirname $0)/lint.sh &&
$(dirname $0)/compile.sh &&
$(dirname $0)/deploy-all.sh;
