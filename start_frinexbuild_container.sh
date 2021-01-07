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

# stop all containers (probably not wanted in future usage)
docker stop $(docker ps -a -q)

# get the latest version of this repository
git pull

# build the frinexbuild dockerfile
docker build --no-cache -f frinexbuild.Dockerfile -t frinexbuild:latest .

# build the frinexapps dockerfile:
docker build --rm -f frinexapps.Dockerfile -t frinexapps:latest .

# start a tomcat docker image to test deployments
# note that this currently will delete anything in webappsStaging
#docker run --name tomcat01 -d --rm -it -p 8091:8080 -v webappsStaging:/usr/local/tomcat/webapps -v $workingDir/tomcat-users.xml:/usr/local/tomcat/conf/tomcat-users.xml -v $workingDir/context.xml:/usr/local/tomcat/webapps.dist/manager/META-INF/context.xml tomcat:9.0 /bin/bash -c "rm -r /usr/local/tomcat/webapps/manager; mv /usr/local/tomcat/webapps.dist/manager /usr/local/tomcat/webapps/; catalina.sh run"
docker build --rm -f tomcatstaging.Dockerfile -t tomcatstaging:latest .

# start the staging tomcat server
docker run --name tomcatstaging -d --rm -i -p 8071:8080 -v webappsStaging:/usr/local/tomcat/webapps tomcatstaging:latest

# start the frinexbuild container with access to docker.sock so that it can create sibling containers of frinexapps
docker run  -v /var/run/docker.sock:/var/run/docker.sock -v webappsStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/usr/local/apache2/htdocs --rm -it --name frinexbuild-test01 -p 8070:80 frinexbuild:latest bash
