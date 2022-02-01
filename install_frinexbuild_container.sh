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
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # get the latest version of this repository
    git pull

    # build the frinexbuild dockerfile
    docker build --no-cache -f docker/frinexbuild.Dockerfile -t frinexbuild:latest .

    # build the frinexapps dockerfile:
    # docker build --rm -f docker/frinexapps.Dockerfile -t frinexapps:latest .

    # build a tomcat docker image to test deployments
    #docker build --rm -f docker/tomcatstaging.Dockerfile -t tomcatstaging:latest .

    # stop all containers (probably not wanted in future usage)
    #docker stop $(docker ps -a -q)

    # trash all the previous build data and output for the purpose of testing only
    #docker volume rm buildServerTarget incomingDirectory listingDirectory processingDirectory webappsTomcatStaging

    # start the staging tomcat server
    #docker run --name tomcatstaging -d --rm -i -p 8071:8080 -v webappsTomcatStaging:/usr/local/tomcat/webapps tomcatstaging:latest

    # build the frinex_db_manager
    # docker build --rm -f docker/frinex_db_manager.Dockerfile -t frinex_db_manager:latest .
    
    # create the frinex_db_manager bridge network 
    # docker network create frinex_db_manager_net

    # remove the old frinex_db_manager
    # docker stop frinex_db_manager 
    # docker container rm frinex_db_manager 

    # start the frinex_db_manager in the bridge network
    # docker run --restart unless-stopped --net frinex_db_manager_net --name frinex_db_manager -d frinex_db_manager:latest

    # remove the old frinexbuild
    docker stop frinexbuild 
    docker container rm frinexbuild 

    # make sure the relevant directories have the correct permissions after an install or update
    docker run  -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected --rm -it --name frinexbuild-permissions frinexbuild:latest bash -c \
      "chmod -R ug+rwx /FrinexBuildService; chown -R frinex:daemon /FrinexBuildService/artifacts; chmod -R ug+rwx /FrinexBuildService/artifacts; chown -R frinex:daemon /FrinexBuildService/git-checkedout; chmod -R ug+rwx /FrinexBuildService/git-checkedout; chown -R frinex:daemon /FrinexBuildService/git-repositories; chmod -R ug+rwx /FrinexBuildService/git-repositories; chown -R frinex:daemon /FrinexBuildService/docs; chmod -R ug+rwx /FrinexBuildService/docs; chown -R frinex:daemon /FrinexBuildService/protected; chmod -R ug+rwx /FrinexBuildService/protected;";
    # move the old logs out of the way, note that this could overwrite old out of the way logs from the same date
    docker run  -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --name frinexbuild-moveoldlogs frinexbuild:latest bash -c \
      "mkdir artifacts/logs-$(date +%F)/; mv artifacts/git-*.txt artifacts/json_to_xml.txt artifacts/update_schema_docs.txt artifacts/logs-$(date +%F)/; echo \"The build process will create an index page and replace this message when the build process starts. <br /><a href=\"cgi/request_build.cgi\">trigger an empty build process</a>\" > /FrinexBuildService/artifacts/index.html";
    # -v $workingDir/BackupFiles:/BackupFiles
    # chown -R frinex:daemon /BackupFiles; chmod -R ug+rwx /BackupFiles

    # start the frinexbuild container with access to docker.sock so that it can create sibling containers of frinexapps
    # docker run --restart unless-stopped --net frinex_db_manager_net -v /var/run/docker.sock:/var/run/docker.sock  -v m2Directory:/maven/.m2/ -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest
    docker run --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock  -v m2Directory:/maven/.m2/ -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v wizardExperiments:/FrinexBuildService/wizard-experiments -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest
    # -v $workingDir/BackupFiles:/BackupFiles 
    # the -v m2Directory:/maven/.m2/ volume is not strictly needed in this container but it makes it easer to run docker purge without destroying the .m2/settings.xml etc
    #docker run  -v /var/run/docker.sock:/var/run/docker.sock -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --name frinexbuild-temp frinexbuild:latest bash
fi;