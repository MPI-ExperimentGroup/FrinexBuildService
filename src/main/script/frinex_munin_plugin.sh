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

staging_web_config() {
    echo "stagingTotal.label Total Staging"
    echo "stagingHealthy.label Healthy Staging"
    echo "stagingProxy.label Proxy Staging"
}

staging_admin_config() {
    echo "stagingAdminTotal.label Total Admin Staging"
    echo "stagingAdminHealthy.label Healthy Admin Staging"
    echo "stagingAdminProxy.label Proxy Admin Staging"
}

production_web_config() {
    echo "productionTotal.label Total Production"
    echo "productionHealthy.label Healthy Production"
    echo "productionProxy.label Proxy Production"
}

production_admin_config() {
    echo "productionAdminTotal.label Total Admin Production"
    echo "productionAdminHealthy.label Healthy Admin Production"
    echo "productionAdminProxy.label Proxy Admin Production"
}

output_config() {
    case $1 in
        staging_web)
            echo "graph_title Frinex Staging Web"
            echo "graph_category frinex"
            staging_web_config
            ;;
        staging_admin)
            echo "graph_title Frinex Staging Admin"
            echo "graph_category frinex"
            staging_admin_config
            ;;
        production_web)
            echo "graph_title Frinex Production Web"
            echo "graph_category frinex"
            production_web_config
            ;;
        production_admin)
            echo "graph_title Frinex Production Admin"
            echo "graph_category frinex"
            production_admin_config
            ;;
        *)
            echo "graph_title Frinex Service Health"
            echo "graph_category frinex"
            staging_web_config
            staging_admin_config
            production_web_config
            production_admin_config
            ;;
    esac
}

staging_web_values() {
    printf "stagingTotal.value %d\n" $(number_of_services "_staging_web")
    printf "stagingHealthy.value %d\n" $(health_of_services "_staging_web")
    printf "stagingProxy.value %d\n" $(health_of_proxy "_staging_web")
}

staging_admin_values() {
    printf "stagingAdminTotal.value %d\n" $(number_of_services "_staging_admin")
    printf "stagingAdminHealthy.value %d\n" $(health_of_services "_staging_admin")
    printf "stagingAdminProxy.value %d\n" $(health_of_proxy "_staging_admin")
}

production_web_values() {
    printf "productionTotal.value %d\n" $(number_of_services "_production_web")
    printf "productionHealthy.value %d\n" $(health_of_services "_production_web")
    printf "productionProxy.value %d\n" $(health_of_proxy "_production_web")
}

production_admin_values() {
    printf "productionAdminTotal.value %d\n" $(number_of_services "_production_admin")
    printf "productionAdminHealthy.value %d\n" $(health_of_services "_production_admin")
    printf "productionAdminProxy.value %d\n" $(health_of_proxy "_production_admin")
}

output_values() {
    case $1 in
        staging_web)
            staging_web_values
            ;;
        staging_admin)
            staging_admin_values
            ;;
        production_web)
            production_web_values
            ;;
        production_admin)
            production_admin_values
            ;;
        *)
            staging_web_values
            staging_admin_values
            production_web_values
            production_admin_values
            ;;
    esac
}

number_of_services() {
    #docker service ls | grep -E $1 | wc -l
    hoststring=$(hostname -f)
    curl --connect-timeout 1 --max-time 2 --silent -H 'Content-Type: application/json' http://$hoststring/services.json | grep -E $1 | wc -l
}

health_of_services() {
    healthCount=0;
    hoststring=$(hostname -f)
    # for currentUrl in $(docker service ls \
    # | grep -E "$1" \
    # | grep -E "8080/tcp" \
    # | sed 's/[*:]//g' \
    # | sed 's/->8080\/tcp//g' \
    # | awk '{print ":" $6 "/" $2 "\n"}')
    for currentUrl in $(curl --connect-timeout 1 --max-time 2 --silent -H 'Content-Type: application/json' http://$hoststring/services.json \
    | grep -E "$1" \
    | sed 's/"port":"//g' \
    | sed 's/["\{\}:,]//g' \
    | awk '{print ":" $4 "/" $1}')
    do
        healthResult=$(curl --connect-timeout 1 --max-time 2 --silent -H 'Content-Type: application/json' http://$hoststring$currentUrl/actuator/health)
        if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            healthCount=$[$healthCount +1]
        fi   
    done
    echo $healthCount
}

health_of_proxy() {
    healthCount=0;
    hoststring=$(hostname -f)
    # for currentUrl in $(docker service ls \
    # | grep -E "$1" \
    # | grep -E "8080/tcp" \
    # | sed 's/[*:]//g' \
    # | sed 's/->8080\/tcp//g' \
    # | awk '{print "/" $2 "-admin\n"}' \
    # | sed 's/_staging_admin-admin/-admin/g')
    for currentUrl in $(curl --connect-timeout 1 --max-time 2 --silent -H 'Content-Type: application/json' http://$hoststring/services.json \
    | grep -E "$1" \
    | sed 's/"port":"//g' \
    | sed 's/["\{\}:,]//g' \
    | sed 's/_staging_admin/-admin staging.example.com/g' \
    | sed 's/_staging_web/ staging.example.com/g' \
    | sed 's/_production_admin/-admin production.example.com/g' \
    | sed 's/_production_web/ production.example.com/g' \
    | awk '{print $2 "/" $1}')
    do
        healthResult=$(curl --connect-timeout 1 --max-time 2 -k --silent -H 'Content-Type: application/json' https://$currentUrl/actuator/health)
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
        output_values "all"
        ;;
    1)
        case $1 in
            config)
                output_config "all"
            *)
                output_values $1
                ;;
        esac
        ;;
    2)
        case $2 in
            config)
                output_config $1
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
