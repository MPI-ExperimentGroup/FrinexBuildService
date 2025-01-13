#!/bin/bash

#
# @since 8 January 2025 15:41 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script copies files from the frinexbuild service to the other nodes in the docker swarm

for filePath in "$@"
do
    echo "$filePath"
    serviceCount=0
    # for nodeName in $(sudo docker node ls --format "{{.Hostname}}")
    for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
    do
        servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
        nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
        echo "nodeName: $nodeName"
        echo "servicePort: $servicePort"
        rsync -auve "ssh -p $servicePort -o BatchMode=yes" $filePath frinex@$nodeName.mpi.nl:/$filePath
        # ssh $nodeName  -p 2200 mv $filePath.tmp $filePath;
        ((serviceCount++))
    done
done
