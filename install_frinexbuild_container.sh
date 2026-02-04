#!/usr/bin/env bash
set -Eeuo pipefail

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

    # the frinex_load_test should not be runing but we remove it now in case it is
    # TODO: later versions have numbered instances of frinex_load_test_N
    docker service rm frinex_load_test || true

    docker system prune
    
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
    docker build --rm -f docker/frinex_db_manager.Dockerfile -t frinexbuild.mpi.nl/frinex_db_manager:latest .
    docker image push frinexbuild.mpi.nl/frinex_db_manager:latest

    # build the frinex stats service image
    docker build --rm -f docker/frinexstats.Dockerfile -t frinexbuild.mpi.nl/frinex_stats:latest .
    docker image push frinexbuild.mpi.nl/frinex_stats:latest

    # This step is not needed in non swarm installations
    # create the frinex_db_manager bridge network 
    docker network create --driver overlay --attachable frinex_db_manager_net
    # This step is not needed in non swarm installations
    # build the frinex_listing_provider
    docker build --rm -f docker/frinex_listing_provider.Dockerfile -t frinexbuild.mpi.nl/frinex_listing_provider:latest .
    docker image push frinexbuild.mpi.nl/frinex_listing_provider:latest

    read -p "Press enter to update the settings.xml"
    # copy the maven settings to the .m2 directory that is a in volume and not the image used to perform the copy
    cat $workingDir/src/main/config/settings.xml | docker run -v m2Directory:/maven/.m2/ -i frinexapps-jdk:alpha /bin/bash -c 'cat > /maven/.m2/settings.xml'

    # start the images that have been built by this script
    bash $workingDir/start_frinexbuild_container.sh

    # refresh the shared scipts used by sysadmin to maintain the running frinex system
    cp $workingDir/clean_frinex_docker.sh /FrinexScripts/
    cp $workingDir/start_frinexbuild_container.sh /FrinexScripts/
    cp $workingDir/start_registry_container.sh /FrinexScripts/
    cp $workingDir/delete_unused_frinex_images.sh /FrinexScripts/
    cp $workingDir/manage_experiment_services.sh /FrinexScripts/
    cp $workingDir/README.md /FrinexScripts/
    chmod a+rx /FrinexScripts/*.sh
fi;