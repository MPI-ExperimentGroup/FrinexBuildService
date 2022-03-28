#!/bin/bash
#
# Copyright (C) 2022 Max Planck Institute for Psycholinguistics
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
# @since 24 March 2022 15:39 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script checks the health satus of the current frinex experiment services and the proxy

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

output_config() {
    echo "Frinex Service Health"
    echo "stagingTotal.label Total Staging"
    echo "stagingHealthy.label Healthy Staging"
    echo "stagingProxy.label Proxy Staging"
    echo "stagingAdminTotal.label Total Admin Staging"
    echo "stagingAdminHealthy.label Healthy Admin Staging"
    echo "stagingAdminProxy.label Proxy Admin Staging"
    echo "productionTotal.label Total Production"
    echo "productionHealthy.label Healthy Production"
    echo "productionProxy.label Proxy Production"
    echo "productionAdminTotal.label Total Admin Production"
    echo "productionAdminHealthy.label Healthy Admin Production"
    echo "productionAdminProxy.label Proxy Admin Production"
}

output_values() {
    printf "stagingTotal.value %d\n" $(number_of_services "_staging_web")
    printf "stagingHealthy.value %d\n" $(health_of_services "_staging_web")
    printf "stagingProxy.value %d\n" $(health_of_proxy "_staging_web")
    printf "stagingAdminTotal.value %d\n" $(number_of_services "_staging_admin")
    printf "stagingAdminHealthy.value %d\n" $(health_of_services "_staging_admin")
    printf "stagingAdminProxy.value %d\n" $(health_of_proxy "_staging_admin")
    printf "productionTotal.value %d\n" $(number_of_services "_production_web")
    printf "productionHealthy.value %d\n" $(health_of_services "_production_web")
    printf "productionProxy.value %d\n" $(health_of_proxy "_production_web")
    printf "productionAdminTotal.value %d\n" $(number_of_services "_production_admin")
    printf "productionAdminHealthy.value %d\n" $(health_of_services "_production_admin")
    printf "productionAdminProxy.value %d\n" $(health_of_proxy "_production_admin")
}

number_of_services() {
    docker service ls | grep -E $1 | wc -l
}

health_of_services() {
    healthCount=0;
    hoststring=$(hostname -f)
    for currentUrl in $(docker service ls \
    | grep -E "$1" \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' \
    | sed 's/->8080\/tcp//g' \
    | awk '{print ":" $6 "/" $2 "\n"}')
    do
        healthResult=$(curl --connect-timeout 1 --silent -H 'Content-Type: application/json' http://$hoststring$currentUrl/actuator/health)
        if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            healthCount=$[$healthCount +1]
        fi   
    done
    echo $healthCount
}

health_of_proxy() {
    healthCount=0;
    nginxProxiedUrl=proxied.example.com
    for currentUrl in $(docker service ls \
    | grep -E "$1" \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' \
    | sed 's/->8080\/tcp//g' \
    | awk '{print "/" $2 "-admin\n"}' \
    | sed 's/_staging_admin-admin/-admin/g')
    do
        healthResult=$(curl --connect-timeout 1 --silent -H 'Content-Type: application/json' http://$nginxProxiedUrl$currentUrl/actuator/health)
        if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            healthCount=$[$healthCount +1]
        fi   
    done
    echo $healthCount
}

output_usage() {
    printf >&2 "%s - munin plugin to show the number and health of Frinex experiment services\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        output_values
        ;;
    1)
        case $1 in
            config)
                output_config
                ;;
            *)
                output_usage
                exit 1
                ;;
        esac
        ;;
    *)
        output_usage
        exit 1
        ;;
esac
