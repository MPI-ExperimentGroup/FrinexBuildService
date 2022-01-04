#!/bin/bash

# Copyright (C) 2021 Max Planck Institute for Psycholinguistics
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
# @since 31 August 2021 14:32 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # this script can be run from a cron job or manually as needed

    # compress and store the docker images in ./BackupFiles
    # repeat the back the up process for each relevant image
    for imageName in "frinexbuild:stable" "frinexapps:stable" "frinexapps:beta" "frinexapps:alpha" "frinexapps:latest" "frinexapps:1.3-audiofix"; do
        # make a backup of each relevant image that is not already on disk
        backupName=$(docker image ls $imageName | awk 'NR>1 {print $1 "_" $2 "_" $3 "_"}')$(date +%F).tar.gz
        if [[ $backupName == *"frinex"* ]]; then
            if [ -s "$workingDir/BackupFiles/$backupName" ]
            then 
                echo "A backup of $backupName already exists and will not be replaced."
            else
                echo "Creating a backup of $imageName to $backupName."
                docker save $imageName | gzip > $workingDir/BackupFiles/$backupName
            fi
        else
            echo "No image $imageName to back up."
        fi
    done
    for frinexImageTag in $(docker images | grep frinexapps | awk 'NR>1 {print $2}'); do
        # make a backup of each relevant image that is not already on disk
        backupName=frinexapps_$frinexImageTag.tar.gz
        if [[ $backupName == *"frinex"* ]]; then
            if [ -s "$workingDir/BackupFiles/$backupName" ]
            then 
                echo "A backup of $backupName already exists and will not be replaced."
            else
                echo "Creating a backup of $frinexImageTag to $backupName."
                docker save frinexapps:$frinexImageTag | gzip > $workingDir/BackupFiles/$backupName
            fi
        else
            echo "No image $frinexImageTag to back up."
        fi
    done

    # the following rsync process is run in a docker container so that it has access to the volumes which will be backed up into ./BackupFiles
    # only directories that cannot be regenerated will be backed up to minimise disk use, however this also means that the first commits to the build server after a restore will take more time and probably require a second commit to start the build process
    echo "Copying the contents of critical volumes to ./BackupFiles"
    docker run --rm -v $workingDir/BackupFiles:/BackupFiles -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -v gitRepositories:/FrinexBuildService/git-repositories -w /ExperimentTemplate/ frinexbuild:stable /bin/bash -c "rsync -a --no-perms --no-owner --no-group --no-times /FrinexBuildService/artifacts /BackupFiles/; rsync -a --no-perms --no-owner --no-group --no-times /FrinexBuildService/git-repositories /BackupFiles/; rsync -a --no-perms --no-owner --no-group --no-times /FrinexBuildService/protected /BackupFiles/;"
fi;









