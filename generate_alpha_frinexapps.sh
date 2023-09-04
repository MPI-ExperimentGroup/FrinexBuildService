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

    # build the frinexapps-jdk dockerfile:
    if docker build --no-cache -f docker/frinexapps-jdk.Dockerfile -t frinexapps-jdk:alpha . 
    then 
        # tag the alpha version with its own build version
        alphaVersion=$(docker run --rm -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:alpha /bin/bash -c "cat /ExperimentTemplate/gwt-cordova.version")
        echo "taging as $alphaVersion"
        docker tag frinexapps-jdk:alpha frinexapps-jdk:$alphaVersion

        # make the current XSD available by version number and alpha so that they can be used by frinex builds with frinexVersion
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:alpha /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/\$(cat /ExperimentTemplate/gwt-cordova.version).xsd"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:alpha /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/\$(cat /ExperimentTemplate/gwt-cordova.version).html"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:alpha /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/alpha.xsd"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:alpha /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/alpha.html"
        docker run --user root --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /FrinexBuildService frinexbuild:latest /bin/bash -c "chown frinex:www-data /FrinexBuildService/artifacts/*.xsd; chown frinex:www-data /FrinexBuildService/artifacts/*.html;"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /FrinexBuildService frinexbuild:latest /bin/bash -c "sed -i \"s|webjars/jquery/jquery.min.js|/lib/jquery.min.js|g\" /FrinexBuildService/artifacts/alpha.html;"
        
        # copy the maven settings to the .m2 directory that is a in volume
        cat $workingDir/src/main/config/settings.xml | docker run -v m2Directory:/maven/.m2/ -i frinexapps-jdk:alpha /bin/bash -c 'cat > /maven/.m2/settings.xml'

        # make sure the local .m2 directory has the alpha jar files. In this case we just install AdaptiveVocabularyAssessmentModule which will also install frinex common and the parent pom, because compiling the GWT component is not needed here
        docker run --rm -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps-jdk:alpha /bin/bash -c "mvn install -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150 -gs /maven/.m2/settings.xml"
        echo "frinexapps-jdk ok"

        # prepare the corova and electron test build files
        docker create -it --name cordova_electron_temp frinexapps-jdk:alpha bash
        docker cp cordova_electron_temp:/test_data_cordova $workingDir/src/main/test_data_cordova
        docker cp cordova_electron_temp:/test_data_electron $workingDir/src/main/test_data_electron
        docker rm -f cordova_electron_temp

        # build the frinexapps-cordova dockerfile:
        if docker build --no-cache -f docker/frinexapps-cordova.Dockerfile -t frinexapps-cordova:alpha .
        then
            docker tag frinexapps-cordova:alpha frinexapps-cordova:$alphaVersion
            echo "frinexapps-cordova ok"
        fi

        # build the frinexapps-electron dockerfile:
        if docker build --no-cache -f docker/frinexapps-electron.Dockerfile -t frinexapps-electron:alpha .
        then
            docker tag frinexapps-electron:alpha frinexapps-electron:$alphaVersion
            echo "frinexapps-electron ok"
        fi

        # update the frinex_examples
        docker run --rm -v gitCheckedout:/FrinexBuildService/git-checkedout -v incomingDirectory:/FrinexBuildService/incoming --w /ExperimentTemplate frinexapps-jdk:alpha /bin/bash -c "cp -r ExperimentDesigner/src/main/resources/examples/* /FrinexBuildService/git-checkedout/frinex_examples/; cp -r /FrinexBuildService/git-checkedout/frinex_examples/* /FrinexBuildService/incoming/; chown -R frinex:www-data /FrinexBuildService/git-checkedout/frinex_examples;chown -R frinex:www-data /FrinexBuildService/incoming;"
        # curl cgi/request_build.cgi
        echo "frinex_examples ok"

        # remove the corova and electron test build files
        rm -r $workingDir/src/main/test_data_cordova
        rm -r $workingDir/src/main/test_data_electron

    fi;
fi;
