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

    # build a tomcat docker image to test deployments
    #docker build --rm -f docker/tomcatstaging.Dockerfile -t tomcatstaging:latest .

    # stop all containers (probably not wanted in future usage)
    #docker stop $(docker ps -a -q)

    # trash all the previous build data and output for the purpose of testing only
    #docker volume rm buildServerTarget incomingDirectory listingDirectory processingDirectory webappsTomcatStaging

    # start the staging tomcat server
    #docker run --name tomcatstaging -d --rm -i -p 8071:8080 -v webappsTomcatStaging:/usr/local/tomcat/webapps tomcatstaging:latest

    # This step is not needed in non swarm installations
    # build the frinex_db_manager
    docker build --rm -f docker/frinex_db_manager.Dockerfile -t frinex_db_manager:latest .
    
    # This step is not needed in non swarm installations
    # create the frinex_db_manager bridge network 
    docker network create frinex_db_manager_net

    # This step is not needed in non swarm installations
    # remove the old frinex_db_manager
    docker stop frinex_db_manager 
    docker container rm frinex_db_manager 

    # If the DB users that are required by frinex_db_manager to create new databases and users do not exist then an error will be shown in the build listing.

    # This step is not needed in non swarm installations
    # start the frinex_db_manager in the bridge network
    docker run --restart unless-stopped --net frinex_db_manager_net --name frinex_db_manager -d frinex_db_manager:latest

    # This step is not needed in non swarm installations
    # build the frinex_listing_provider
    docker build --rm -f docker/frinex_listing_provider.Dockerfile -t frinex_listing_provider:latest .
    # remove the old frinex_listing_provider
    docker stop frinex_listing_provider 
    docker container rm frinex_listing_provider 
    # start the frinex_listing_provider
    docker run --restart unless-stopped --name frinex_listing_provider --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -d -p 8010:80 frinex_listing_provider:latest

    # remove the old frinexbuild
    docker stop frinexbuild 
    docker container rm frinexbuild 

    # make sure the relevant directories have the correct permissions after an install or update
    docker run  -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected --rm -it --user root --name frinexbuild-permissions frinexbuild:latest bash -c \
      "chmod -R ug+rwx /FrinexBuildService; chown -R frinex:www-data /FrinexBuildService/artifacts; chmod -R ug+rwx /FrinexBuildService/artifacts; chown -R www-data:daemon /FrinexBuildService/git-checkedout; chmod -R ug+rwx /FrinexBuildService/git-checkedout; chown -R www-data:daemon /FrinexBuildService/git-repositories; chmod -R ug+rwx /FrinexBuildService/git-repositories; chown -R frinex:www-data /FrinexBuildService/docs; chmod -R ug+rwx /FrinexBuildService/docs; chown -R frinex:www-data /FrinexBuildService/protected; chmod -R ug+rwx /FrinexBuildService/protected;chown -R frinex:www-data /FrinexBuildService/incoming; chmod -R ug+rwx /FrinexBuildService/incoming; chown -R frinex:www-data /FrinexBuildService/listing; chmod -R ug+rwx /FrinexBuildService/listing; chown -R frinex:www-data /FrinexBuildService/processing; chmod -R ug+rwx /FrinexBuildService/processing;";
    # move the old logs out of the way, note that this could overwrite old out of the way logs from the same date
    docker run  -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --user root --name frinexbuild-moveoldlogs frinexbuild:latest bash -c \
      "mkdir artifacts/logs-$(date +%F)/; mv artifacts/git-*.txt artifacts/json_to_xml.txt artifacts/update_schema_docs.txt artifacts/logs-$(date +%F)/; cp /FrinexBuildService/buildlisting.html /FrinexBuildService/artifacts/index.html; chmod -R ug+rwx /FrinexBuildService/artifacts/index.html; chown -R frinex:www-data /FrinexBuildService/artifacts/index.html";
    # iterate the git checkout directories and reset them in case they were damaged in an unexpected shutdown
    docker run -v gitCheckedout:/FrinexBuildService/git-checkedout --rm -it --name frinexbuild-reset-git-co frinexbuild:latest bash -c \
      "cd /FrinexBuildService/git-checkedout/; for checkoutDirectory in /FrinexBuildService/git-checkedout/*/ ; do cd \$checkoutDirectory; pwd; if [ -f .git/index.lock ]; then rm .git/index.lock; git restore .; fi; done;";
    # -v $workingDir/BackupFiles:/BackupFiles
    # chown -R frinex:daemon /BackupFiles; chmod -R ug+rwx /BackupFiles

    # start the frinexbuild container with access to /var/run/docker.sock so that it can create sibling containers of frinexapps
    docker run --restart unless-stopped --net frinex_db_manager_net --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -v /etc/localtime:/etc/localtime:ro -v m2Directory:/maven/.m2/ -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest
    # in non swarm installations the frinex_db_manager_net is excluded as follows
    #docker run --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock -v m2Directory:/maven/.m2/ -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v wizardExperiments:/FrinexBuildService/wizard-experiments -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest
    # -v $workingDir/BackupFiles:/BackupFiles 
    # the -v m2Directory:/maven/.m2/ volume is not strictly needed in this container but it makes it easer to run docker purge without destroying the .m2/settings.xml etc
    # docker run  --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --name frinexbuild-temp frinexbuild:latest bash
fi;