#!/bin/bash

source $(dirname $0)/script_info.sh;

$(dirname $0)/deploy-scripts.sh &&
$(dirname $0)/deploy-html.sh &&
$(dirname $0)/deploy-media.sh --if-missing;
