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

# the user that runs this script must have docker permissions, eg is in the docker group

read -p "Press enter to restart frinex_db_manager"
# This step is not needed in non swarm installations
# remove the old frinex_db_manager
# docker stop frinex_db_manager 
# docker container rm frinex_db_manager 

# If the DB users that are required by frinex_db_manager to create new databases and users do not exist then an error will be shown in the build listing.

# This step is not needed in non swarm installations
# start the frinex_db_manager in the bridge network
# docker run --cpus=".5" --restart unless-stopped --net frinex_db_manager_net --name frinex_db_manager -d frinex_db_manager:latest
docker service rm frinex_db_manager
docker service create -d --limit-cpu 0.5 --network frinex_db_manager_net --name frinex_db_manager frinexbuild.mpi.nl/frinex_db_manager:latest

read -p "Press enter to restart frinex_listing_provider"
# remove the old frinex_listing_provider
docker stop frinex_listing_provider 
docker container rm frinex_listing_provider 
# start the frinex_listing_provider
docker run --cpus=".5" --restart unless-stopped --name frinex_listing_provider -v protectedDirectory:/FrinexBuildService/protected -v buildServerTarget:/FrinexBuildService/artifacts --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -d -p 8010:80 frinexbuild.mpi.nl/frinex_listing_provider:latest

read -p "Press enter to restart frinex_service_manager"
# remove the old frinex_service_manager
docker stop frinex_service_manager 
docker container rm frinex_service_manager 
# start the frinex_service_manager
# TODO: once per hour is probably a bit too often unless we are also generating munin stats
docker run --user frinex --cpus=".5" --restart unless-stopped -v buildServerTarget:/FrinexBuildService/artifacts --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -dit --name frinex_service_manager frinexbuild.mpi.nl/frinex_listing_provider:latest bash -c "while true; do /FrinexBuildService/sleep_and_resurrect_docker_experiments.sh; sleep 1h; done;"

echo "starting the frinex stats service"
# docker container stop frinex_stats;
# docker container rm frinex_stats
# docker run --rm -d -p 3000:3000 --name=frinex_stats frinex_stats; 
docker service rm frinex_stats
docker service create -d --name frinex_stats -p 3000:3000 frinexbuild.mpi.nl/frinex_stats:latest

read -p "Press enter to restart frinexbuild"
# remove the old frinexbuild
docker stop frinexbuild 
docker container rm frinexbuild 

# make sure the relevant directories have the correct permissions after an install or update
docker run -v gitRepositories:/FrinexBuildService/git-repositories -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -v m2Directory:/maven/.m2/ --rm -it --user root --name frinexbuild-permissions frinexbuild:latest bash -c \
    "chmod -R ug+rwx /FrinexBuildService; chown -R frinex:www-data /FrinexBuildService/artifacts; chmod -R ug+rwx /FrinexBuildService/artifacts; chown -R www-data:daemon /FrinexBuildService/git-repositories; chmod -R ug+rwx /FrinexBuildService/git-repositories; chown -R frinex:www-data /FrinexBuildService/docs; chmod -R ug+rwx /FrinexBuildService/docs; chown -R frinex:www-data /FrinexBuildService/protected; chmod -R ug+rwx /FrinexBuildService/protected;chown -R frinex:www-data /FrinexBuildService/incoming; chmod -R ug+rwx /FrinexBuildService/incoming; chown -R frinex:www-data /FrinexBuildService/listing; chmod -R ug+rwx /FrinexBuildService/listing; chown -R frinex:www-data /FrinexBuildService/processing; chmod -R ug+rwx /FrinexBuildService/processing; chown -R frinex:www-data /maven; chmod -R ug+rwx /maven;";
#  -v gitCheckedout:/FrinexBuildService/git-checkedout
# chown -R www-data:daemon /FrinexBuildService/git-checkedout; chmod -R ug+rwx /FrinexBuildService/git-checkedout;

# move the old logs out of the way, note that this could overwrite old out of the way logs from the same date
docker run  -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --user root --name frinexbuild-moveoldlogs frinexbuild:latest bash -c \
    "mkdir artifacts/logs-$(date +%F)/; mv artifacts/git-*.txt artifacts/json_to_xml.txt artifacts/sync_swarm_nodes.txt artifacts/update_schema_docs.txt artifacts/logs-$(date +%F)/; cp /FrinexBuildService/buildlisting.html /FrinexBuildService/artifacts/index.html; chmod -R ug+rwx /FrinexBuildService/artifacts/index.html; chown -R frinex:www-data /FrinexBuildService/artifacts/index.html";

# iterate the git checkout directories and reset them in case they were damaged in an unexpected shutdown
# docker run -v gitCheckedout:/FrinexBuildService/git-checkedout --rm -it --name frinexbuild-reset-git-co frinexbuild:latest bash -c \
#     "cd /FrinexBuildService/git-checkedout/; for checkoutDirectory in /FrinexBuildService/git-checkedout/*/ ; do cd \$checkoutDirectory; pwd; if [ -f .git/index.lock ]; then rm .git/index.lock; git restore .; fi; if [ -f .git/shallow.lock ]; then rm .git/shallow.lock; git restore .; fi; done;";
# -v $workingDir/BackupFiles:/BackupFiles
# chown -R frinex:daemon /BackupFiles; chmod -R ug+rwx /BackupFiles

# to save server side disk space the following was used to clean up the admin war files which contained the desktop and mobile application artifacts
# for adminWar in /FrinexBuildService/protected/*/*_admin.war; do zip -d $adminWar \*_cordova.aab \*_ios.zip \*_cordova.apk \*-x64-lt.zip \*-x64.zip \*_android.zip \*-x64-lt.zip; done;

# start the frinexbuild container with access to /var/run/docker.sock so that it can create sibling containers of frinexapps
# docker run --cpus=".5" --restart unless-stopped --net frinex_db_manager_net --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -v /etc/localtime:/etc/localtime:ro -v m2Directory:/maven/.m2/ -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest

docker service rm frinexbuild
docker service create \
  --name frinexbuild \
  --replicas 1 \
  --constraint 'node.hostname==lux27' \
  --restart-condition any \
  --network frinex_db_manager_net \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=bind,src=/etc/localtime,dst=/etc/localtime,readonly \
  --mount type=volume,src=m2Directory,dst=/maven/.m2 \
  --mount type=volume,src=gitRepositories,dst=/FrinexBuildService/git-repositories \
  --mount type=volume,src=webappsTomcatStaging,dst=/usr/local/tomcat/webapps \
  --mount type=volume,src=incomingDirectory,dst=/FrinexBuildService/incoming \
  --mount type=volume,src=listingDirectory,dst=/FrinexBuildService/listing \
  --mount type=volume,src=processingDirectory,dst=/FrinexBuildService/processing \
  --mount type=volume,src=buildServerTarget,dst=/FrinexBuildService/artifacts \
  --mount type=volume,src=protectedDirectory,dst=/FrinexBuildService/protected \
  --limit-cpu 0.5 \
  -p 80:80 \
  -p 8070:80 \
  -d \
  frinexbuild:latest

# --net frinex_synchronisation_net 
# 2024-07-18 removed the gitCheckedout from the frinexbuild container because it can be recreated as required and its deletion saves disk space
# -v gitCheckedout:/FrinexBuildService/git-checkedout 

# in non swarm installations the frinex_db_manager_net is excluded as follows
#docker run --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock -v m2Directory:/maven/.m2/ -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected -dit --name frinexbuild  -p 80:80 -p 8070:80 frinexbuild:latest
# -v $workingDir/BackupFiles:/BackupFiles 
# -v wizardExperiments:/FrinexBuildService/wizard-experiments 
# the -v m2Directory:/maven/.m2/ volume is not strictly needed in this container but it makes it easer to run docker purge without destroying the .m2/settings.xml etc
# docker run  --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v webappsTomcatStaging:/usr/local/tomcat/webapps -v incomingDirectory:/FrinexBuildService/incoming -v listingDirectory:/FrinexBuildService/listing -v processingDirectory:/FrinexBuildService/processing -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --name frinexbuild-temp frinexbuild:latest bash
