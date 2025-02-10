#!/bin/bash

#
# @since 8 January 2025 15:41 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script copies files from the frinexbuild service to the other nodes in the docker swarm

for filePath in "$@"
do
    echo "filePath: $filePath"
    serviceCount=0
    # set the permissions here because of strange outcomes via node
    chmod 774 $filePath
    # for nodeName in $(sudo docker node ls --format "{{.Hostname}}")
    for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
    do
        servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
        nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
        echo "nodeName: $nodeName"
        echo "servicePort: $servicePort"
        rsync --mkpath -apuve "ssh -p $servicePort -o BatchMode=yes" $filePath frinex@$nodeName.mpi.nl:/$filePath
        # ssh $nodeName  -p 2200 mv $filePath.tmp $filePath;
        ((serviceCount++))

        # output a debuging diff of the local and renote files
        ls -lG /FrinexBuildService/protected/uppercasetest > listingLocal.txt;
        ls -lG /FrinexBuildService/artifacts/uppercasetest >> listingLocal.txt;
        ssh $nodeName.mpi.nl -p $servicePort "ls -lG /FrinexBuildService/protected/uppercasetest; ls -lG /FrinexBuildService/artifacts/uppercasetest" > listing$servicePort.txt; 
        diff --ignore-space-change -U 0 listingLocal.txt listing$servicePort.txt
    done
    # cd /FrinexBuildService;
    # ssh lux27.mpi.nl -p 2200 "ls -lG /FrinexBuildService/protected/uppercasetest; ls -lG /FrinexBuildService/artifacts/uppercasetest" > lux27.txt;
    # ssh lux28.mpi.nl -p 2201 "ls -lG /FrinexBuildService/protected/uppercasetest; ls -lG /FrinexBuildService/artifacts/uppercasetest" > lux28.txt; 
    # ssh lux29.mpi.nl -p 2202 "ls -lG /FrinexBuildService/protected/uppercasetest; ls -lG /FrinexBuildService/artifacts/uppercasetest" > lux29.txt; 
    # diff lux27.txt lux28.txt
    # diff lux27.txt lux29.txt
done
