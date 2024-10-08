#!/bin/bash
# Copyright (C) 2024 Max Planck Institute for Psycholinguistics
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

# @since 07 October 2024 11:36 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

# this script runs as a service on each swarm node and makes sure that the 
# images used by each experiment service is available locally should the 
# registry become unavailable or be moved to a differnent node. Any image
# that is not used in a service will be cleaned to save disk space. Any 
# image that is local and used by a service but not in the registry will
# be pushed to the registry for other nodes to access.
while true
do
    echo "DOCKER_REGISTRY"
    echo "$ServiceHostname"
    whoami
    # echo all arguments
    printf '%s\n' "$*"

    # Add a service to run on all nodes, when a service is running where the image is not local then pull that image
    # When the registry start up, push all images for running services to the freshly started registry
    # On each node a clean can be run and all images not found in the running services can be deleted

    # 1009  curl -k https://DOCKER_REGISTRY/v2/_catalog?n=1000
    # 1010  curl -k https://DOCKER_REGISTRY/v2/very_large_example_staging_admin/tags/list

    serviceList=$(sudo docker service ls | grep -E "_staging_web|_production_web|_staging_admin|_production_admin" | awk '{print $5}')
    imageList=$(sudo docker image ls --format "{{.Repository}}:{{.Tag}}" | grep -E "_staging_web|_production_web|_staging_admin|_production_admin")
    for currentServiceImage in $serviceList
    do
        echo $currentServiceImage
        tagNameService=$(echo "$currentServiceImage" | cut -d ":" -f 2)
        imageNameService=$(echo "$currentServiceImage" | cut -d ":" -f 1)
        echo "serviceList: $tagNameService $imageNameService"
        registryHasTags=$(curl -k "https://DOCKER_REGISTRY/v2/$imageNameService/tags/list")
        echo "registryHasTags: $registryHasTags"
    done
    for imageName in $imageList
    do
        tagName=$(echo "$imageName" | cut -d ":" -f 2)
        imageName=$(echo "$imageName" | cut -d ":" -f 1)
        echo "imageList: $tagName $imageName"
        if [[ $serviceList != *"$imageName"* ]]; then
          echo "$imageName not a service"
        else
          echo "$imageName service found"
        fi
    done

    sleep 1h
done