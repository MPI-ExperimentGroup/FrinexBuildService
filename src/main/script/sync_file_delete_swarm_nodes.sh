#!/bin/bash

#
# @since 14 January 2025 17:55 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script deletes build output files on all nodes in the docker swarm

for buildName in "$@"
do
    echo "$filePath"
    for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
    do
        servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
        nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
        echo "nodeName: $nodeName"
        echo "servicePort: $servicePort"
        # rsync --mkpath -auve "ssh -p $servicePort -o BatchMode=yes" $filePath frinex@$nodeName.mpi.nl:/$filePath
        ssh $nodeName.mpi.nl -p $servicePort \
            'echo "delete the staging artifacts";' \
            'rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web.war;' \
            ' rm /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_web.war;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web_sources.jar;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_admin_sources.jar;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_android.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_cordova.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_darwin*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_electron.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_vr.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_ios.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_win32*;' \
            'echo "delete the production artifacts";' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web.war;' \
            ' rm /FrinexBuildService/protected/'$buildName'/'$buildName'_production_web.war;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web_sources.jar;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_admin_sources.jar;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_android.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_cordova.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_darwin*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_electron.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_vr.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_ios.*;' \
            ' rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_win32*;';
    done
done
