#!/bin/bash

#
# @since 8 January 2025 15:41 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script copies files from the frinexbuild service to the other nodes in the docker swarm

for filePath in "$@"
do
    echo "$filePath"
    for nodeName in $(sudo docker node ls --format "{{.Hostname}}")
    do
        echo "$nodeName"
        rsync -auve 'ssh -p 2200' $filePath frinex@$nodeName:/$filePath
        # ssh $nodeName  -p 2200 mv $filePath.tmp $filePath;
    done
done
