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
productionbUrl="https://productionb.example.com"

staging_web_config() {
    echo "stagingUnknown.label Unknown Staging"
    echo "stagingHealthy.label Healthy Staging"
    echo "stagingSleeping.label Sleeping Staging"
    echo "stagingUnknown.draw AREASTACK"
    echo "stagingHealthy.draw AREASTACK"
    echo "stagingSleeping.draw AREASTACK"
}

staging_admin_config() {
    echo "stagingAdminUnknown.label Unknown Admin Staging"
    echo "stagingAdminHealthy.label Healthy Admin Staging"
    echo "stagingAdminSleeping.label Sleeping Admin Staging"
    echo "stagingAdminUnknown.draw AREASTACK"
    echo "stagingAdminHealthy.draw AREASTACK"
    echo "stagingAdminSleeping.draw AREASTACK"
}

production_web_config() {
    echo "productionUnknown.label Unknown Production"
    echo "productionHealthy.label Healthy Production"
    echo "productionSleeping.label Sleeping Production"
    echo "productionUnknown.draw AREASTACK"
    echo "productionHealthy.draw AREASTACK"
    echo "productionSleeping.draw AREASTACK"
}

production_admin_config() {
    echo "productionAdminUnknown.label Unknown Admin Production"
    echo "productionAdminHealthy.label Healthy Admin Production"
    echo "productionAdminSleeping.label Sleeping Admin Production"
    echo "productionAdminUnknown.draw AREASTACK"
    echo "productionAdminHealthy.draw AREASTACK"
    echo "productionAdminSleeping.draw AREASTACK"
}

output_config() {
    case $1 in
        staging_web)
            echo "graph_title Frinex Tomcat Health Staging Web"
            echo "graph_category frinex"
            staging_web_config
            ;;
        staging_admin)
            echo "graph_title Frinex Tomcat Health Staging Admin"
            echo "graph_category frinex"
            staging_admin_config
            ;;
        production_web)
            echo "graph_title Frinex Tomcat Health Production Web"
            echo "graph_category frinex"
            production_web_config
            ;;
        production_admin)
            echo "graph_title Frinex Tomcat Health Production Admin"
            echo "graph_category frinex"
            production_admin_config
            ;;
        productionb_web)
            echo "graph_title Frinex Tomcat Health ProductionB Web"
            echo "graph_category frinex"
            production_web_config
            ;;
        productionb_admin)
            echo "graph_title Frinex Tomcat Health ProductionB Admin"
            echo "graph_category frinex"
            production_admin_config
            ;;
        *)
            echo "graph_title Frinex Tomcat Deployments Health"
            echo "graph_category frinex"
            staging_web_config
            staging_admin_config
            production_web_config
            production_admin_config
            ;;
    esac
}

staging_web_values() {
    echo "$(health_of_services "$stagingUrl" "" "staging")"
    printf "stagingSleeping.value %d\n" $(number_of_sleeping "$stagingUrl")
}

staging_admin_values() {
    echo "$(health_of_services "$stagingUrl" "-admin" "stagingAdmin")"
    printf "stagingAdminSleeping.value %d\n" $(number_of_sleeping "$stagingUrl")
}

production_web_values() {
    echo "$(health_of_services "$productionUrl" "" "production")"
    printf "productionSleeping.value %d\n" $(number_of_sleeping "$productionUrl")
}

production_admin_values() {
    echo "$(health_of_services "$productionUrl" "-admin" "productionAdmin")"
    printf "productionAdminSleeping.value %d\n" $(number_of_sleeping "$productionUrl")
}

productionb_web_values() {
    echo "$(health_of_services "$productionbUrl" "" "production")"
    printf "productionbSleeping.value %d\n" $(number_of_sleeping "$productionbUrl")
}

productionb_admin_values() {
    echo "$(health_of_services "$productionbUrl" "-admin" "productionAdmin")"
    printf "productionbAdminSleeping.value %d\n" $(number_of_sleeping "$productionbUrl")
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
        productionb_web)
            cat $dataDirectory/productionb_web_values
            productionb_web_values > $dataDirectory/productionb_web_values&
            ;;
        productionb_admin)
            cat $dataDirectory/productionb_admin_values
            productionb_admin_values > $dataDirectory/productionb_admin_values&
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


health_of_services() {
    healthCount=0;
    unknownCount=0;
    for serviceUrl in $(curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' $1/running_experiments.json | grep -v '}' | grep -v '{' | sed 's/"//g' | sed 's/,//g')
    do
        healthResult=$(curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' $1/$serviceUrl$2/actuator/health)
        if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            healthCount=$[$healthCount +1]
        else
            unknownCount=$[$unknownCount +1]
        fi   
    done
    echo "$3Healthy.value $healthCount"
    echo "$3Unknown.value $unknownCount"
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
            frinex_tomcat_productionb_web)
                output_values "productionb_web"
                ;;
            frinex_tomcat_productionb_admin)
                output_values "productionb_admin"
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
                    frinex_tomcat_productionb_web)
                        output_config "productionb_web"
                        ;;
                    frinex_tomcat_productionb_admin)
                        output_config "productionb_admin"
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