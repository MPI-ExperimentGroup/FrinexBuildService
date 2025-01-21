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
            remoteCommand='ls -l /FrinexBuildService/artifacts/'$buildName'/'$buildName'*;
            ls -l /FrinexBuildService/protected/'$buildName'/'$buildName'*;
            '
            if [ "$buildStage" == "transfer" ]; then
                remoteCommand=$remoteCommand'echo "transfer: delete commit file";
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'.xml.commit;
            ';
            fi
            if [ "$buildStage" == "staging" ] || [ "$buildStage" == "undeploy" ]; then
                remoteCommand=$remoteCommand'echo "delete the staging artifacts";
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web.war;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_web.war;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_admin.war;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_web_sources.jar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_admin_sources.jar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_android.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_cordova.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_darwin*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_linux*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_electron.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_vr.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_ios.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_win32*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging*.asar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging*.dmg;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_staging_artifacts.json;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_admin.Docker;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_web.Docker;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_admin.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_android.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_staging_electron.txt;
';
            fi
            if [ "$buildStage" == "production" ] || [ "$buildStage" == "undeploy" ]; then
                remoteCommand=$remoteCommand'echo "delete the production artifacts";
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web.war;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_web.war;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_admin.war;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_web_sources.jar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_admin_sources.jar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_android.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_cordova.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_darwin*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_linux*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_electron.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_vr.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_ios.*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_win32*;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production*.asar;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production*.dmg;
rm -f /FrinexBuildService/artifacts/'$buildName'/'$buildName'_production_artifacts.json;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_admin.Docker;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_web.Docker;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_admin.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_android.txt;
rm -f /FrinexBuildService/protected/'$buildName'/'$buildName'_production_electron.txt;
';
            fi
            remoteCommand=$remoteCommand'ls -l /FrinexBuildService/artifacts/'$buildName'/'$buildName'*;
            ls -l /FrinexBuildService/protected/'$buildName'/'$buildName'*;
            '
            echo "remoteCommand: $remoteCommand"
            ssh -o "BatchMode yes" $nodeName.mpi.nl -p $servicePort "$remoteCommand"
        done
    fi
fi
