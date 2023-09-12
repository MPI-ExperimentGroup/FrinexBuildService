#!/bin/bash

# Copyright (C) 2023 Max Planck Institute for Psycholinguistics
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
#

#
# @since 12 September 2023 14:47 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/config

# check that the properties to be used match the current machine
if ! grep -q $(hostname) publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    echo "update requested for $1 examples"
    # TODO: check for changes and always update examples using $1 version
    # update the frinex_examples
    docker run --rm -v gitCheckedout:/FrinexBuildService/git-checkedout -v incomingDirectory:/FrinexBuildService/incoming -w /ExperimentTemplate frinexapps-jdk:alpha /bin/bash -c "\
    git pull; \
    mkdir -p /FrinexBuildService/git-checkedout/frinex_examples/; \
    for configFile in $(diff -q ExperimentDesigner/src/main/resources/examples/ /FrinexBuildService/git-checkedout/frinex_examples/ | grep -Ei '.xml' | sed -e \"s|.*ExperimentDesigner/src/main/resources/examples/||g\" | sed -e \"s/.xml .*//g\"); \
    do \
        cp -rfu ExperimentDesigner/src/main/resources/examples/$configFile.xml /FrinexBuildService/git-checkedout/frinex_examples/; \
        cp -rfu /FrinexBuildService/git-checkedout/frinex_examples/$configFile.xml /FrinexBuildService/incoming/commits/; \
        cp -rfu ExperimentDesigner/src/main/resources/examples/$configFile/ /FrinexBuildService/git-checkedout/frinex_examples/; \
        cp -rfu /FrinexBuildService/git-checkedout/frinex_examples/$configFile/ /FrinexBuildService/incoming/commits/; \
    done; \
    chmod -R a+rw /FrinexBuildService/incoming/commits/*; \
    ls /FrinexBuildService/git-checkedout/frinex_examples/; \
    ls /FrinexBuildService/incoming/commits/;" \";
    echo "frinex_examples ok, to trigger the examples to be built browse to /cgi/request_build.cgi, requires log in."
fi;
