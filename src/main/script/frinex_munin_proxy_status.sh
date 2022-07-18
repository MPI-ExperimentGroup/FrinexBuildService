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
# @since 15 July 2022 14:07 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This MUNIN plugin monitors the ratio of experiments served by tomcat vs docker and the health of the nginx proxy and web application for each entry

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
linkName=$(basename $0)
dataDirectory=/srv/frinex_munin_data/frinex_proxy_status

output_values() {
    serviceList="$(sudo docker service ls \
        | grep -E "8080/tcp" \
        | grep -E "_$3" \
        | sed 's/[*:]//g' | sed 's/->8080\/tcp//g')"


    # echo "$serviceList" \
    #     | grep -E "_admin|_web" \
    #     | grep -E "_production" \
    #     | awk '{print "location /" $2 " {\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
    #     | sed 's/_production_web {/ {/g' \
    #     | sed 's/_production_admin {/-admin {/g' \
    #     > /usr/local/apache2/htdocs/frinex_production_locations.txt

    # echo "$serviceList" \
    #     | grep -E "_production" \
    #     | awk '{print "upstream " $1 " {\n server lux22.mpi.nl:" $6 ";\n server lux23.mpi.nl:" $6 ";\n server lux25.mpi.nl:" $6 ";\n}\n"}' \
    #     > /usr/local/apache2/htdocs/frinex_production_upstreams.txt

    # echo "$serviceList" \
    #     | grep -E "_admin|_web" \
    #     | grep -E "_staging" \
    #     | awk '{print "location /" $2 " {\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
    #     | sed 's/_staging_web {/ {/g' \
    #     | sed 's/_staging_admin {/-admin {/g' \
    #     > /usr/local/apache2/htdocs/frinex_staging_locations.txt

    # echo "$serviceList" \
    #     | grep -E "_staging" \
    #     | awk '{print "upstream " $1 " {\n server lux22.mpi.nl:" $6 ";\n server lux23.mpi.nl:" $6 ";\n server lux25.mpi.nl:" $6 ";\n}\n"}' \
    #     > /usr/local/apache2/htdocs/frinex_staging_upstreams.txt

    echo "$0, $1, $2, $3, " > $dataDirectory/plugin.log
    dockerWebTotal=0;
    dockerAdminTotal=0;
    dockerWebFound=0;
    dockerAdminFound=0;
    tomcatWebTotal=0;
    tomcatAdminTotal=0;
    tomcatWebFound=0;
    tomcatAdminFound=0;
    for runningWar in $( \
        echo "$serviceList" \
        | grep -E "_admin|_web" \
        | grep -E "_$3" \
        | awk '{print $2}' \
        | sed "s/_$3_web//g" \
        | sed "s/_$3_admin/-admin/g" \
        )
    do
        #echo "service URL: https://$2/$runningWar/actuator/health" >> $dataDirectory/plugin.log
        headerResult=$(curl -k -I --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' https://$2/$runningWar/actuator/health | grep "spring-boot")
            if [[ "$headerResult" == *"spring-boot"* ]]; then
                if [[ "$runningWar" == *"-admin"* ]]; then
                    dockerAdminFound=$[$dockerAdminFound +1]
                else
                    dockerWebFound=$[$dockerWebFound +1]
                fi
                # echo "admin found $tomcatAdminFound" >> $dataDirectory/plugin.log
            else
                echo "service not found: https://$2/$runningWar/actuator/health" >> $dataDirectory/plugin.log
            fi
            if [[ "$runningWar" == *"-admin"* ]]; then
                dockerAdminTotal=$[$dockerAdminTotal +1]
            else
                dockerWebTotal=$[$dockerWebTotal +1]
            fi
    done
    echo "dockerWebTotal.value $dockerWebTotal"
    echo "dockerAdminTotal.value $dockerAdminTotal"
    echo "dockerWebFound.value $dockerWebFound"
    echo "dockerAdminFound.value $dockerAdminFound"

    for runningWar in $(curl -k -s https://$1/running_experiments.json | grep -E "\"" | sed "s/\"//g" |sed "s/,//g")
    do
        if [[ ${serviceList} != *$runningWar"_staging"* ]]; then
            # echo -e "location /$runningWar {\n proxy_pass https://tomcatstaging/$runningWar;\n}\n\nlocation /$runningWar-admin {\n proxy_pass https://tomcatstaging/$runningWar-admin;\n}\n" >> /usr/local/apache2/htdocs/frinex_tomcat_staging_locations.txt
            headerResult=$(curl -k -I --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' https://$2/$runningWar-admin/actuator/health | grep "spring-boot")
            if [[ "$headerResult" == *"spring-boot"* ]]; then
                tomcatAdminFound=$[$tomcatAdminFound +1]
                # echo "admin found $tomcatAdminFound" >> $dataDirectory/plugin.log
            else
                echo "tomcat not found: https://$2/$runningWar-admin/actuator/health" >> $dataDirectory/plugin.log
            fi
            headerResult=$(curl -k -I --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' https://$2/$runningWar/actuator/health | grep "spring-boot")
            if [[ "$headerResult" == *"spring-boot"* ]]; then
                tomcatWebFound=$[$tomcatWebFound +1]
                # echo "web found $tomcatWebFound" >> $dataDirectory/plugin.log
            else
                echo "tomcat not found: https://$2/$runningWar/actuator/health" >> $dataDirectory/plugin.log
            fi
            tomcatWebTotal=$[$tomcatWebTotal +1]
            tomcatAdminTotal=$[$tomcatAdminTotal +1]
            # echo "" >> $dataDirectory/plugin.log
            # echo "https://$2/$runningWar-admin/actuator/health" >> $dataDirectory/plugin.log
            # echo "$headerResult" >> $dataDirectory/plugin.log
        fi
    done
    echo "tomcatWebTotal.value $tomcatWebTotal"
    echo "tomcatAdminTotal.value $tomcatAdminTotal"
    # echo "tomcatAdminTotal.value $tomcatAdminTotal" >> $dataDirectory/plugin.log
    echo "tomcatWebFound.value $tomcatWebFound"
    echo "tomcatAdminFound.value $tomcatAdminFound"
    # echo "tomcatAdminFound.value $tomcatAdminFound" >> $dataDirectory/plugin.log
}

output_config() {
    echo "graph_title Frinex Tomcat Docker Ratio $0 $1 $2"
    echo "graph_category frinex"
    echo "tomcatWebTotal.label Tomcat Web Total"
    echo "tomcatAdminTotal.label Tomcat Admin Total"
    echo "tomcatWebFound.label Tomcat Web Found"
    echo "tomcatAdminFound.label Tomcat Admin Found"
    echo "dockerWebTotal.label Docket Web Total"
    echo "dockerAdminTotal.label Docket Admin Total"
    echo "dockerWebFound.label Docket Web Found"
    echo "dockerAdminFound.label Docket Admin Found"
}

update_data() {
    serverNameParts=${1//_/ }
    output_values ${serverNameParts[0]} ${serverNameParts[1]} ${serverNameParts[2]} > $dataDirectory/$1.values
    output_config ${serverNameParts[0]} ${serverNameParts[1]} ${serverNameParts[2]} > $dataDirectory/$1.config
}

output_usage() {
    printf >&2 "%s - munin plugin to show the ratio of experiments served by tomcat vs docker and the health of the nginx proxy and web application for each entry\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        touch $dataDirectory/${linkName#"frinex_proxy_status_"}.values
        cat $dataDirectory/${linkName#"frinex_proxy_status_"}.values
        update_data ${linkName#"frinex_proxy_status_"}&
        ;;
    1)
        case $1 in
            config)
                touch $dataDirectory/${linkName#"frinex_proxy_status_"}.config
                cat $dataDirectory/${linkName#"frinex_proxy_status_"}.config
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
