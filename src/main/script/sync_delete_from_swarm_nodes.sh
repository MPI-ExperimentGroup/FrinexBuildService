#!/bin/bash

#
# @since 14 January 2025 17:55 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script deletes build output files on all nodes in the docker swarm

buildName=$1
buildStage=$2
if [[ "$buildName" == "" || "$buildStage" == "" ]]; then
    echo "both buildName: $buildName and buildStage: $buildStage are required"
else if [ ! -d "/FrinexBuildService/artifacts/$buildName" ]; then
        echo "directory not found /FrinexBuildService/artifacts/$buildName"
    else
        for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
        do
            servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
            nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
            echo "buildName: $buildName"
            echo "buildStage: $buildStage"
            echo "nodeName: $nodeName"
            echo "servicePort: $servicePort"
            remoteCommand=""
            if [ "$buildStage" == "transfer" ]; then
                remoteCommand=$remoteCommand'echo "transfer: delete commit file";
rm /FrinexBuildService/protected/'$buildName'/'$buildName'.xml.commit;
            ';
            fi
            if [ "$buildStage" == "staging" ] || [ "$buildStage" == "undeploy" ]; then
                remoteCommand=$remoteCommand'echo "delete the staging artifacts";
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web.war;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_web.war;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_admin.war;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web_sources.jar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_admin_sources.jar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_android.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_cordova.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_darwin*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_linux*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_electron.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_vr.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_ios.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_win32*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging*.asar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging*.dmg;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_artifacts.json;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_admin.Docker;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_web.Docker;
';
            fi
            if [ "$buildStage" == "production" ] || [ "$buildStage" == "undeploy" ]; then
                remoteCommand=$remoteCommand'echo "delete the production artifacts";
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web.war;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_production_web.war;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_production_admin.war;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web_sources.jar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_admin_sources.jar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_android.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_cordova.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_darwin*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_linux*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_electron.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_vr.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_ios.*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_win32*;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production*.asar;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production*.dmg;
rm /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_artifacts.json;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_production_admin.Docker;
rm /FrinexBuildService/protected/'$buildName'/'$buildName'_production_web.Docker;
';
            fi
            echo "remoteCommand: $remoteCommand"
            ls -l /FrinexBuildService/artifacts/$buildName/$buildName*;
            ls -l /FrinexBuildService/protected/$buildName/$buildName*;
            ssh -o "BatchMode yes" $nodeName.mpi.nl -p $servicePort "$remoteCommand"
            ls -l /FrinexBuildService/artifacts/$buildName/$buildName*;
            ls -l /FrinexBuildService/protected/$buildName/$buildName*;
        done
    fi
fi
