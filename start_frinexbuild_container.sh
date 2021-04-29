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
# @since 22 Feb 2021 14:08 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)

# check that the properties to be used match the current machine
if ! grep -q $(hostname) src/main/docker/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # remove the old frinexbuild
    docker stop frinexbuild 
    docker container rm frinexbuild 

    # start the frinexbuild container with access to docker.sock so that it can create sibling containers of frinexapps
    docker run --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock - -v m2Directory:/maven/.m2/ v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v $workingDir/BackupFiles:/BackupFiles -dit --name frinexbuild -p 8070:80 frinexbuild:latest
    # the -v m2Directory:/maven/.m2/ volume is not strictly needed in this container but it makes it easer to run docker purge without destroying the .m2/settings.xml etc
fi;