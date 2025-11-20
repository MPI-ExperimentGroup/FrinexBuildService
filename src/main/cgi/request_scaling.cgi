#!/bin/bash

# Copyright (C) 2025 Max Planck Institute for Psycholinguistics
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

# @since 27 Oct 2025 11:58 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

cd $(dirname "$0")
targetDir=TargetDirectory

# this script checks the number of instances of a service and will scale up to a set limit

maxInstances=15
# echo "$QUERY_STRING"
serviceName=$(echo "$QUERY_STRING" | sed -n 's/^.*service=\([0-9a-z_]*\).*$/\1/p')
# echo "$serviceName"
avgMs=$(echo "$QUERY_STRING" | sed -n 's/^.*avgMs=\([0-9a-z_]*\).*$/\1/p')
# echo "$avgMs"
total=$(echo "$QUERY_STRING" | sed -n 's/^.*total=\([0-9a-z_]*\).*$/\1/p')
# echo "$total"
status=$(echo "$QUERY_STRING" | sed -n 's/^.*status=\([0-9a-z_]*\).*$/\1/p')
# echo "$status"
instanceCount=$(sudo docker service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "$serviceName")
# echo "$instanceCount"
runningCount=$(sudo docker service ps --filter "desired-state=running" --format '{{.CurrentState}}' "$serviceName" | grep -c "Running")

lastUpdate=$(sudo docker service inspect --format '{{.UpdatedAt}}' "$serviceName" | sed -E 's/\.[0-9]+//; s/ UTC//')

lockfile="$targetDir/request_scaling.lock"
(
    flock -n 200 || exit 1
    echo "date,maxInstances,instanceCount,avgMs,requests,service,status" > $targetDir/request_scaling.temp
    echo "$(date),$maxInstances,$instanceCount,$avgMs,$total,$serviceName,$status" >> $targetDir/request_scaling.temp
    tail -n +2 $targetDir/request_scaling.txt | head -n 1000 >> $targetDir/request_scaling.temp
    mv $targetDir/request_scaling.temp $targetDir/request_scaling.txt
    
    echo "Content-type: text/html"
    echo ''
    echo "$lastUpdate"
    if [[ $(date -d "$lastUpdate" +%s) -gt $(( $(date +%s) - 300 )) ]]; then
        echo "$serviceName lastUpdate $lastUpdate"
    else
        if (( avgMs > 250 )); then
            if (( runningCount < instanceCount )); then
                echo "Waiting instances $runningCount of $instanceCount<br/>"
            else
                if (( instanceCount < maxInstances )); then
                    ((instanceCount++))
                    echo "Scaling up $instanceCount <br/>"
                    experimentName=$(echo "$serviceName" | sed 's/_production_web$//g'| sed 's/_production_admin$//g' | sed 's/_staging_web$//g'| sed 's/_staging_admin$//g')
                    echo "experimentName: $experimentName"
                    lineNumber=$(grep -n -m1 "$serviceName" /FrinexBuildService/artifacts/ports.txt | cut -d: -f1);
                    if [ -z "$lineNumber" ]; then
                        echo "$serviceName" >> /FrinexBuildService/artifacts/ports.txt
                        lineNumber=$(wc -l < /FrinexBuildService/artifacts/ports.txt)
                        # todo: ports.txt needs to be synchronised to the other swarm nodes
                    fi
                    echo "lineNumber: $lineNumber"
                    hostPort=$(( 10000 + (lineNumber * 20) + $instanceCount ))
                    echo "hostPort: $hostPort"
                    imageDateTag=$(unzip -p /FrinexBuildService/protected/$experimentName/$(echo "$serviceName.war" | sed "s/_admin.war/_web.war/g") version.json | grep compileDate | sed "s/[^0-9]//g")
                    echo "imageDateTag: $imageDateTag"
                    # todo: put the scaling back in when the locations and upstreams can cope with the new setup
                    # sudo docker service create --name $serviceName-$instanceCount DOCKER_SERVICE_OPTIONS -d --publish mode=host,target=8080,published=$hostPort DOCKER_REGISTRY/$serviceName:$imageDateTag # &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
                    sudo docker service scale "${serviceName}=${instanceCount}"

                    # sudo docker service update --publish-rm 8080 $serviceName
                    # sudo docker service update --publish-add target=8080,mode=host --replicas "$instanceCount" "$serviceName"
                else
                    echo "Already max instances <br/>"
                fi
            fi
        # until nginx has two instances we are not scalling down because each change will trigger and nginx reload
        # else
        #     if (( avgMs < 5 && instanceCount > 1 )); then
        #         if (( runningCount < instanceCount )); then
        #             echo "Waiting instances $avgMs<br/>"
        #         else
        #             ((instanceCount--))
        #             echo "Scaling down $instanceCount <br/>"
        #             sudo docker service scale "${serviceName}=${instanceCount}"
        #         fi
        #     else
        #         echo "avgMs: $avgMs <= 500 : $instanceCount<br/>"
        #     fi
        fi
    fi
    echo "ok"
) 200>"$lockfile"
# echo "maxInstances: $maxInstances<br/>"
# echo "serviceName: $serviceName<br/>"
# echo "instanceCount: $instanceCount<br/>"
