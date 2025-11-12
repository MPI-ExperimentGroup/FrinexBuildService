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

lockfile="$targetDir/request_scaling.lock"
(
    flock -n 200 || exit 1
    echo "date,maxInstances,instanceCount,avgMs,requests,service,status" > $targetDir/request_scaling.temp
    echo "$(date),$maxInstances,$instanceCount,$avgMs,$total,$serviceName,$status" >> $targetDir/request_scaling.temp
    tail -n +2 $targetDir/request_scaling.txt | head -n 1000 >> $targetDir/request_scaling.temp
    mv $targetDir/request_scaling.temp $targetDir/request_scaling.txt
) 200>"$lockfile"
echo "Content-type: text/html"
echo ''
if (( avgMs > 250 )); then
  if (( runningCount < instanceCount )); then
    echo "Waiting instances $runningCount of $instanceCount<br/>"
  else
    if (( instanceCount < maxInstances )); then
        ((instanceCount++))
        echo "Scaling to $instanceCount <br/>"
        sudo docker service scale "${serviceName}=${instanceCount}"
    else
        echo "Already max instances <br/>"
    fi
  fi
else
  echo "avgMs ($avgMs) <= 500 : $instanceCount<br/>"
fi
echo "ok"
# echo "maxInstances: $maxInstances<br/>"
# echo "serviceName: $serviceName<br/>"
# echo "instanceCount: $instanceCount<br/>"
