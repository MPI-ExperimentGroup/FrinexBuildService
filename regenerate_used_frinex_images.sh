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
# @since 20 August 2024 17:47 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#


# search through all staging web war files extracting a list of Frinex versions in use
inUseCompileDates=$(docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -it --name frinex-images-cleanup frinexbuild:latest bash -c "(for warFile in artifacts/*/*_staging_web.war;do unzip -p \$warFile version.json | grep lastCommitDate; done;) | sort -r | uniq")
echo "inUseCompileDates:"
echo "$inUseCompileDates"

cd src/main/

IFS=$'\n'
for compileDateString in $inUseCompileDates
do
    compileDate=$(echo "$compileDateString" | sed "s/lastCommitDate:'//g" | sed "s/',//g")
    compileDateTag=$(echo "$compileDate" | sed "s/[^0-9]//g")
    echo $compileDate
    echo $compileDateTag
    # build the compile date based version based on alpha:
    if docker build --no-cache --build-arg lastCommitDate="$compileDate" -f docker/rebuild-jdk-version.Dockerfile -t "frinexapps-jdk:$compileDateTag" . 
    then 
        # tag the compileDate version with its own build version
        compileDateVersion=$(docker run --rm -w /ExperimentTemplate/gwt-cordova "frinexapps-jdk:$compileDateTag" /bin/bash -c "cat /ExperimentTemplate/gwt-cordova.version")
        echo "taging as $compileDateVersion"
        docker tag "frinexapps-jdk:$compileDateTag" frinexapps-jdk:$compileDateVersion
        docker tag "frinexapps-cordova:alpha" frinexapps-cordova:$compileDateVersion
        docker tag "frinexapps-electron:alpha" frinexapps-electron:$compileDateVersion
    fi
done
