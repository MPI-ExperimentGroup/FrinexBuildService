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

    # sudo docker image ls
    # sudo docker container ls
    # if [[ $ServiceHostname == "lux28" ]]; then
    #     # cleaning up aggressively
    #     echo "is lux28 so cleaning up aggressively"
    #     sudo docker image ls
    #     sudo docker container prune -f
    #     sudo docker image prune -f
    #     # sudo docker volume prune -f
    #     sudo docker image ls
    # fi

    untagedCount=0;
    missingCount=0;
    localCount=0;
    # delete stray images without tags
    # sudo docker image rm $(sudo docker image ls | grep "<none>" | grep -E "_staging_web|_production_web|_staging_admin|_production_admin" | awk '{print $3}')
    # sudo docker image ls | grep "<none>" | grep -E "_staging_web|_production_web|_staging_admin|_production_admin"

    serviceList=$(sudo docker service ls | grep -E "_staging_web|_production_web|_staging_admin|_production_admin" | awk '{print $5}')
    imageList=$(sudo docker image ls --format "{{.Repository}}:{{.Tag}}" | grep -E "_staging_web|_production_web|_staging_admin|_production_admin")
    pushImages=false
    if [ "$pushImages" = true ]; then
      for currentServiceImage in $serviceList
      do
          # echo "currentServiceImage: $currentServiceImage"
          tagNameService=$(echo "$currentServiceImage" | cut -d ":" -f 2)
          imageNameService=$(echo "$currentServiceImage" | cut -d ":" -f 1)
          imageNamePart=$(echo "$imageNameService" | cut -d "/" -f 2)
          # echo "serviceParts: $imageNameService $tagNameService"
          # echo "imageNamePart: $imageNamePart"
          registryHasTags=$(curl -sk "https://DOCKER_REGISTRY/v2/$imageNamePart/tags/list")
          # echo "registryHasTags: $registryHasTags"
          if [[ $registryHasTags != *"$tagNameService"* ]]; then
          #   echo "$currentServiceImage tag missing"
            if [[ $imageList == *"$currentServiceImage"* ]]; then
            # echo "$currentServiceImage local found, not pushed so overlays data accumulation can be compared"
              echo "$currentServiceImage local found, can be pushed"
              sudo docker push "$currentServiceImage"
              localCount=$((localCount + 1))
            else
              missingCount=$((missingCount + 1))
            fi
          else
          #   echo "$currentServiceImage tag found"
            if [[ $imageList != *"$currentServiceImage"* ]]; then
            # echo "$currentServiceImage local missing, not pulled so overlays data accumulation can be compared"
              echo "$currentServiceImage local missing, can be pulled"
              sudo docker pull "$currentServiceImage"
            else
              localCount=$((localCount + 1))
            fi
          fi
      done
    fi
    for imageName in $imageList
    do
        # tagName=$(echo "$imageName" | cut -d ":" -f 2)
        # imageName=$(echo "$imageName" | cut -d ":" -f 1)
        # echo "imageList: $imageName"
        if [[ $serviceList != *"$imageName"* ]]; then
            if [[ $imageName != *"<none>"* ]]; then
            # echo "$imageName not a service, not removed so overlays data accumulation can be compared"
              echo "$imageName not a service, can be removed"
              # TODO: clean up all the images with the tag <none>
              #   imageNameCleaned=$(echo $imageName | sed "s/:<none>/:/g";)
              #   sudo docker image rm "$imageNameCleaned"
              sudo docker image rm "$imageName"
            else
                untagedCount=$((untagedCount + 1))
            #     echo "$imageName leaving untaged image as is"
            fi
        # else
        #   echo "$imageName service found"
        fi
    done
    echo "untagedCount: $untagedCount"
    echo "missingCount: $missingCount"
    echo "localCount: $localCount"
    # show the volumes on this node
    sudo docker volume ls
    # show the remaining non experiment images on this node
    # sudo docker image ls | grep -vE "_staging_web|_production_web|_staging_admin|_production_admin"
    sudo docker image ls
    # show some stats
    sudo docker system df
    # prune unused data on this node
    sudo docker system prune -f
    date

    # to catch cases when this node has become out of sync due to down time rsync any differences from the other nodes
    # for each node rsync pull any missing files then make a lock file to prevent that node being pulled again
    for servicePortAndNode in $(sudo docker service ls --format "{{.Ports}}{{.Name}}" -f "name=frinex_synchronisation_service" | sed 's/[*:]//g' | sed 's/->22\/tcp//g')
    do
        servicePort=$(echo $servicePortAndNode | sed 's/frinex_synchronisation_service_[a-zA-Z0-9]*//g')
        nodeName=$(echo $servicePortAndNode | sed 's/[0-9]*frinex_synchronisation_service_//g')
        echo "nodeName: $nodeName"
        echo "servicePort: $servicePort"
        if [ "$nodeName" == "$ServiceHostname" ]; then
          echo "This service is running on $ServiceHostname so skipping this node"
        else
          if ! [ -e "/FrinexBuildService/$nodeName.lock" ] ; then
            echo "syncing from $nodeName"
            for volumeDirectory in artifacts protected; do
              echo "volume directory: $volumeDirectory"
              echo "skipping (via dryrun) rsync so overlays data accumulation can be compared"
              rsyncTempFile="/FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.log"
              statisticsTempFile="/FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.temp"
              rsync --prune-empty-dirs --mkpath -vapue "ssh -p $servicePort -o BatchMode=yes" \
              --dry-run \
              --include="*/" \
              --include="*_web.war" \
              --include="*_admin.war" \
              --include="*_sources.war" \
              --include="*-public_usage_stats.json" \
              --include="*.commit" \
              --exclude="*" \
              --filter="+ /FrinexBuildService/artifacts/*/*.commit" \
              --filter="- /FrinexBuildService/artifacts/*" \
              --filter="- /FrinexBuildService/protected/*" \
              frinex@$nodeName.mpi.nl:/FrinexBuildService/$volumeDirectory /FrinexBuildService/$volumeDirectory > $rsyncTempFile;
              grep -E '^\.f' $rsyncTempFile | awk -v output="$statisticsTempFile" -v currentDate="$(date)" '
              {
                  flag = substr($0, 2, 9);
                  size_diff = substr(flag, 2, 1) == "s";
                  time_diff = substr(flag, 5, 1) == "t";
                  missing   = substr(flag, 1, 1) == "+";
                  if (missing) m++;
                  if (time_diff) t++;
                  if (size_diff) s++;
              }
              END {
                  print "date,missing,mtime_diff,size_diff" > statisticsTempFile;
                  print currentDate "," m "," t "," s >> statisticsTempFile;
              }'
            done
            tail -n +2 /FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.txt | head -n 1000 >> /FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.temp
            mv /FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.temp /FrinexBuildService/artifacts/artifacts-$ServiceHostname-$nodeName.txt
            touch "/FrinexBuildService/$nodeName.lock"
          else
            echo "node sync lock file exists /FrinexBuildService/$nodeName.lock"
          fi
        fi
        ((serviceCount++))
    done
    echo "date,untagedCount,missingCount,localCount" > /FrinexBuildService/artifacts/grafana_service_image_stats.temp
    echo "$(date),$untagedCount,$missingCount,$localCount" >> /FrinexBuildService/artifacts/grafana_service_image_stats.temp
    tail -n +2 /FrinexBuildService/artifacts/grafana_service_image_stats.txt | head -n 1000 >> /FrinexBuildService/artifacts/grafana_service_image_stats.temp
    mv /FrinexBuildService/artifacts/grafana_service_image_stats.temp /FrinexBuildService/artifacts/grafana_service_image_stats.txt
    date
    sleep 1h
done