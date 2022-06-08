#!/bin/bash

# Copyright (C) 2020 Max Planck Institute for Psycholinguistics
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
# @since 29 April 2021 15:25 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # get the latest version of this repository
    git pull

    # build the frinexapps dockerfile:
    if docker build --no-cache -f docker/frinexapps-jdk.Dockerfile -t frinexapps-jdk:latest .
    then
        # tag the latest version with its own build version
        latestVersion=$(docker run --rm -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cat /ExperimentTemplate/gwt-cordova.version")
        echo "taging as $latestVersion"
        docker tag frinexapps-jdk:latest frinexapps-jdk:$latestVersion

        # make the current XSD available by version number and latest so that they can be used by frinex builds with frinexVersion
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/\$(cat /ExperimentTemplate/gwt-cordova.version).xsd"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/\$(cat /ExperimentTemplate/gwt-cordova.version).html"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/latest.xsd"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/latest.html"
        # make sure the local .m2 directory has the latest jar files.
        docker run --rm -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps-jdk:latest /bin/bash -c "mvn install -gs /maven/.m2/settings.xml"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /FrinexBuildService frinexbuild:latest /bin/bash -c "chown frinex:www-data /FrinexBuildService/artifacts/*.xsd; chown frinex:www-data /FrinexBuildService/artifacts/*.html;"
    fi;
fi;
