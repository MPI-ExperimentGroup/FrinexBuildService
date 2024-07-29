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
# @since 07 September 2023 17:47 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#


# search through all staging web war files extracting a list of Frinex versions in use
inUseList=$(docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -it --name frinex-images-cleanup frinexbuild:latest bash -c "(for warFile in artifacts/*/*_staging_web.war;do unzip -p \$warFile version.json | grep projectVersion; done;) | sort | uniq | tr '\n' ' '")
echo "inUseList:"
echo "$inUseList"

keepList=$(echo "$inUseList" | sed "s/projectVersion:'/|/g" | sed "s/-stable'/-'/g" | sed -E "s/', *//g" | sed -E "s/^ *\|//g")
echo "keepList:"
echo "$keepList"

# TODO: grep the docker image ls minus the exclude list and remove the remaining images after warning the user

excludeList=$(docker image ls | grep -E " alpha | beta | snapshot | stable |1.3-audiofix|stable_20|beta_20|$keepList" | awk '{print $3}' | sort | uniq | tr '\n' '|' | sed -E "s/\|$//g")
echo "excludeList:"
echo "$excludeList"

echo "deleteList:"
deleteList=$(docker image ls | grep "frinexapps" | grep -vE "$excludeList" | awk '{print $3}' | sort | uniq)
echo "$deleteList"

for imageName in $deleteList
do
    echo "Known versions that are in use:"
    echo "$inUseList"
    echo "Pending deletion:"
    docker image ls | grep $imageName
    read -p "Delete $imageName? (y/n))" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        docker image rm $imageName
    fi
done

# clean up the m2Directory volume
cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Cannot clean up the m2Directory volume because the publish.properties does not match the current machine.";
else
    read -p "Press enter to delete and regenerate the m2Directory (a slow process and not mandatory)"
    echo "Deleting and regenerating the m2Directory"
    docker run -v m2Directory:/maven/.m2/ -i frinexapps-jdk:alpha /bin/bash -c 'rm -rf /maven/.m2/*'
    # copy the maven settings to the .m2 directory
    cat $workingDir/src/main/config/settings.xml | docker run -v m2Directory:/maven/.m2/ -i frinexapps-jdk:alpha /bin/bash -c 'cat > /maven/.m2/settings.xml'

    # iterate all remaining images and make sure the maven dependencies are in the m2Directory volume
    imagesList=$(docker image ls | grep -E "frinexapps-jdk" | awk '{print $2}')
    for tagName in $imagesList
    do
        echo "tagName: $tagName"
        # instaling the pom to make sure the .m2 directory dependencies are available for this image
        docker run --rm -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps-jdk:$tagName /bin/bash -c "mvn install -pl '!gwt-cordova,!registration' -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150 -gs /maven/.m2/settings.xml"
    done
fi
