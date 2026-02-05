#!/bin/bash
#
# Copyright (C) 2026 Max Planck Institute for Psycholinguistics
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
#

#
# @since 12 Jan 2026 15:55 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script calls actuator health on all experiment service instances

echo "Content-type: text/json"
echo ''

serviceListUnique="$(sudo docker service ls --format '{{.Name}}' \
    | grep -E "_admin|_web" \
    | sed 's/_[0-9]\+$//' \
    | sort -u)"

serviceListAll="$(sudo docker service ls --format '{{.Name}}' \
    | grep -E "_admin|_web")"

# echo "{"
isFirstService=true
for serviceName in $serviceListUnique; do
    if [[ $serviceName == *_production_admin || $serviceName == *_production_web ]]; then
        deploymentType="production"
    else
        deploymentType="staging"
    fi
    urlName=$(sed -e 's/_staging_web//' -e 's/_staging_admin/-admin/' -e 's/_production_web//' -e 's/_production_admin/-admin/' <<< "$serviceName")    
    portalUrlName=$(sed -e 's/-admin$/-portal/' <<< "$urlName")
    # if [ "$isFirstService" = true ]; then
    #     isFirstService=false
    # else
    #     echo ","
    # fi
    echo -n "\"https://frinex${deploymentType}.mpi.nl/${urlName}\": "
    if ! curl -sS --connect-timeout 5 "https://frinex${deploymentType}.mpi.nl/${urlName}/actuator/health" >/dev/null 2>/dev/null; then
        rc=$?
        if [ $rc -eq 60 ]; then
            echo -n "CERT_INVALID "
        fi
    fi
    if curl -k -fsS "https://frinex${deploymentType}.mpi.nl/${urlName}/actuator/health" >/dev/null 2>/dev/null; then
        echo "OK"
    else
        echo "FAIL"
    fi
    echo -n "\"https://frinex${deploymentType}.mpi.nl/${portalUrlName}\": "
    if curl -k -fsS "https://frinex${deploymentType}.mpi.nl/${portalUrlName}/actuator/health" >/dev/null 2>/dev/null; then
        echo "OK"
    else
        echo "FAIL"
    fi    
    isFirstInstance=true
    for instanceName in $(printf "%s\n" "$serviceListAll" | grep "^$serviceName"); do
        ports=$(sudo docker service inspect --format '{{range .Endpoint.Ports}}{{.PublishedPort}} {{end}}' "$instanceName")
        while read -r node; do
            for port in $ports; do
                echo -n "\"http://${node}:${port}/${urlName}\": "
                if curl -fsS http://${node}:{$port}/${urlName}/actuator/health >/dev/null; then
                    echo "OK"
                else
                    echo "FAIL"
                fi
                # if [ "$isFirstInstance" = true ]; then
                #     isFirstInstance=false
                # else
                #     echo ","
                # fi
            done
        done < <(sudo docker service ps --filter "desired-state=running" --format '{{.Node}}' "$instanceName")
    done
    # echo -e "}"
done 
# echo "}"
