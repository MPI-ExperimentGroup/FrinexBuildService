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
# @since 20 April 2022 16:37 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script checks the health satus of the current frinex experiment services on tomcat

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
dataDirectory=/srv/frinex_munin_data/tomcat
stagingUrl="https://staging.example.com"
productionUrl="https://production.example.com"

staging_web_config() {
    echo "stagingTotal.label Total Staging"
    echo "stagingHealthy.label Healthy Staging"
    echo "stagingSleeping.label Sleeping Staging"
    echo "stagingHealthy.stack"
    echo "stagingSleeping.stack"
}

staging_admin_config() {
    echo "stagingAdminTotal.label Total Admin Staging"
    echo "stagingAdminHealthy.label Healthy Admin Staging"
    echo "stagingAdminSleeping.label Sleeping Admin Staging"
    echo "stagingAdminHealthy.stack"
    echo "stagingAdminSleeping.stack"
}

production_web_config() {
    echo "productionTotal.label Total Production"
    echo "productionHealthy.label Healthy Production"
    echo "productionSleeping.label Sleeping Production"
    echo "productionHealthy.stack"
    echo "productionSleeping.stack"
}

production_admin_config() {
    echo "productionAdminTotal.label Total Admin Production"
    echo "productionAdminHealthy.label Healthy Admin Production"
    echo "productionAdminSleeping.label Sleeping Admin Production"
    echo "productionAdminHealthy.stack"
    echo "productionAdminSleeping.stack"
}

output_config() {
    case $1 in
        staging_web)
            echo "graph_title Frinex Tomcat Staging Web"
            echo "graph_category frinex"
            staging_web_config
            ;;
        staging_admin)
            echo "graph_title Frinex Tomcat Staging Admin"
            echo "graph_category frinex"
            staging_admin_config
            ;;
        production_web)
            echo "graph_title Frinex Tomcat Production Web"
            echo "graph_category frinex"
            production_web_config
            ;;
        production_admin)
            echo "graph_title Frinex Tomcat Production Admin"
            echo "graph_category frinex"
            production_admin_config
            ;;
        *)
            echo "graph_title Frinex Tomcat Service Health"
            echo "graph_category frinex"
            staging_web_config
            staging_admin_config
            production_web_config
            production_admin_config
            ;;
    esac
}

staging_web_values() {
    printf "stagingTotal.value %d\n" $(number_of_services "$stagingUrl")
    printf "stagingHealthy.value %d\n" $(health_of_services "$stagingUrl" "_staging_web")
    printf "stagingSleeping.value %d\n" $(number_of_sleeping "$stagingUrl")
}

staging_admin_values() {
    printf "stagingAdminTotal.value %d\n" $(number_of_services "$stagingUrl")
    printf "stagingAdminHealthy.value %d\n" $(health_of_services "$stagingUrl" "_staging_admin")
    printf "stagingAdminSleeping.value %d\n" $(number_of_sleeping "$stagingUrl")
}

production_web_values() {
    printf "productionTotal.value %d\n" $(number_of_services "$productionUrl")
    printf "productionHealthy.value %d\n" $(health_of_services "$productionUrl" "_production_web")
    printf "productionSleeping.value %d\n" $(number_of_sleeping "$productionUrl)
}

production_admin_values() {
    printf "productionAdminTotal.value %d\n" $(number_of_services "$productionUrl")
    printf "productionAdminHealthy.value %d\n" $(health_of_services "$productionUrl" "_production_admin")
    printf "productionAdminSleeping.value %d\n" $(number_of_sleeping "$productionUrl")
}

output_values() {
    case $1 in
        staging_web)
            cat $dataDirectory/staging_web_values
            staging_web_values > $dataDirectory/staging_web_values&
            ;;
        staging_admin)
            cat $dataDirectory/staging_admin_values
            staging_admin_values > $dataDirectory/staging_admin_values&
            ;;
        production_web)
            cat $dataDirectory/production_web_values
            production_web_values > $dataDirectory/production_web_values&
            ;;
        production_admin)
            cat $dataDirectory/production_admin_values
            production_admin_values > $dataDirectory/production_admin_values&
            ;;
        *)
            cat $dataDirectory/frinex_munin_all
            { staging_web_values; staging_admin_values; production_web_values; production_admin_values; } > $dataDirectory/frinex_munin_all&
            ;;
    esac
}

number_of_sleeping() {
    curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' $1/known_sleepers.json | grep -v '}' | grep -v '{' | wc -l
}

number_of_services() {
    curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' $1/running_experiments.json | grep -v '}' | grep -v '{' | wc -l
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
    for currentUrl in $(curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' http://$hoststring/services.json \
    | grep -E "$1" \
    | sed 's/"port":"//g' \
    | sed 's/["\{\}:,]//g' \
    | awk '{print ":" $4 "/" $1}')
    do
        healthResult=$(curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' http://$hoststring$currentUrl/actuator/health)
        if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            healthCount=$[$healthCount +1]
        fi   
    done
    echo $healthCount
}

output_usage() {
    printf >&2 "%s - munin plugin to show the number and health of Frinex experiment services running on tomcat\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        case $(basename $0) in
            frinex_tomcat_staging_web)
                output_values "staging_web"
                ;;
            frinex_tomcat_staging_admin)
                output_values "staging_admin"
                ;;
            frinex_tomcat_production_web)
                output_values "production_web"
                ;;
            frinex_tomcat_production_admin)
                output_values "production_admin"
                ;;
            *)
                output_values "all"
                ;;
        esac
        ;;
    1)
        case $1 in
            config)
                case $(basename $0) in
                    frinex_tomcat_staging_web)
                        output_config "staging_web"
                        ;;
                    frinex_tomcat_staging_admin)
                        output_config "staging_admin"
                        ;;
                    frinex_tomcat_production_web)
                        output_config "production_web"
                        ;;
                    frinex_tomcat_production_admin)
                        output_config "production_admin"
                        ;;
                    *)
                        output_config "all"
                        ;;
                esac
                ;;
            *)
                output_values $1
                ;;
        esac
        ;;
    2)
        case $2 in
            config)
                output_config $1
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
