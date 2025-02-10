#!/bin/bash

#
# @since 10 February 2025 12:26 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script diffs the files for a given experiment on all nodes in the docker swarm

buildName=$1
if [[ "$buildName" == "" ]]; then
    echo "buildName: $buildName is required"
else if [ ! -d "/FrinexBuildService/artifacts/$buildName" ]; then
        echo "directory not found /FrinexBuildService/artifacts/$buildName"
    else
        for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
        do
            servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
            nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
            echo "buildName: $buildName"
            echo "nodeName: $nodeName"
            echo "servicePort: $servicePort"

            # output a debuging diff of the local and renote files
            ls -l /FrinexBuildService/protected/$buildName > /FrinexBuildService/artifacts/$buildName/listingLocal.txt;
            ls -l /FrinexBuildService/artifacts/$buildName >> /FrinexBuildService/artifacts/$buildName/listingLocal.txt;
            ssh $nodeName.mpi.nl -p $servicePort "ls -l /FrinexBuildService/protected/$buildName; ls -l /FrinexBuildService/artifacts/$buildName" > /FrinexBuildService/artifacts/$buildName/listing$servicePort.txt; 
            diff --ignore-space-change -U 0 /FrinexBuildService/artifacts/$buildName/listingLocal.txt /FrinexBuildService/artifacts/$buildName/listing$servicePort.txt
        done
    fi
fi
