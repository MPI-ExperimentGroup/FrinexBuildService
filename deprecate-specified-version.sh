#!/bin/bash

# Copyright (C) 2024 Max Planck Institute for Psycholinguistics
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
# @since 26 March 2024 11:38 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    read -p "Enter Frinex Version x.x.xxxx: " imageName
    if [[ "$imageName" =~ ^[0-9]{1}\.[0-9]{1}\.[0-9]{4}$ ]]; then
        echo "Valid Frinex Version $imageName"
        docker image ls | grep $imageName

        # make a deprecated tag for the jdk image
        docker tag frinexapps-jdk:$imageName-stable frinexapps-jdk:$imageName-deprecated
        # remove the stable tag
        docker image rm frinexapps-jdk:$imageName-stable
    
        # make a deprecated tag for the cordova image
        docker tag frinexapps-cordova:$imageName-stable frinexapps-cordova:$imageName-deprecated
        # remove the stable tag
        docker image rm frinexapps-cordova:$imageName-stable
    
        # make a deprecated tag for the electron image
        docker tag frinexapps-electron:$imageName-stable frinexapps-electron:$imageName-deprecated
        # remove the stable tag
        docker image rm frinexapps-electron:$imageName-stable
    
        docker image ls | grep $imageName

        # rename the XSD and HTML documentation from stable to deprecated
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "ls /FrinexBuildService/artifacts/$imageName*"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "mv /FrinexBuildService/artifacts/$imageName-stable.xsd /FrinexBuildService/artifacts/$imageName-deprecated.xsd"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "mv /FrinexBuildService/artifacts/$imageName-stable.html /FrinexBuildService/artifacts/$imageName-deprecated.html"
        docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "ls /FrinexBuildService/artifacts/$imageName*"
    else
        echo "Invalid Frinex Version $imageName"
    fi
fi;


