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
# @since 23 October 2020 14:08 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)

# check that the properties to be used match the current machine
if ! grep -q $(hostname) publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # stop all containers (probably not wanted in future usage)
    docker stop $(docker ps -a -q)

    # trash all the previous build data and output for the purpose of testing only
    #docker volume rm buildServerTarget incomingDirectory listingDirectory processingDirectory webappsTomcatStaging

    # get the latest version of this repository
    git pull

    # build the frinexbuild dockerfile
    docker build --no-cache -f frinexbuild.Dockerfile -t frinexbuild:latest .

    # build the frinexapps dockerfile:
    docker build --rm -f frinexapps.Dockerfile -t frinexapps:latest .

    # start a tomcat docker image to test deployments
    #docker build --rm -f tomcatstaging.Dockerfile -t tomcatstaging:latest .

    # start the staging tomcat server
    #docker run --name tomcatstaging -d --rm -i -p 8071:8080 -v webappsTomcatStaging:/usr/local/tomcat/webapps tomcatstaging:latest

    # start the frinexbuild container with access to docker.sock so that it can create sibling containers of frinexapps
    docker run --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/usr/local/apache2/htdocs --rm -dit --name frinexbuild -p 8070:80 frinexbuild:latest
    #docker run  -v /var/run/docker.sock:/var/run/docker.sock -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/usr/local/apache2/htdocs --rm -it --name frinexbuild-temp frinexbuild:latest bash
fi;