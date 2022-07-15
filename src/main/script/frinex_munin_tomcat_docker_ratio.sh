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
dataDirectory=/srv/frinex_munin_data/tomcat_docker_ratio

output_values() {
    serviceList="$(sudo docker service ls \
        | grep -E "8080/tcp" \
        | grep -E "_$2" \
        | sed 's/[*:]//g' | sed 's/->8080\/tcp//g')"

    echo -n "dockerWebTotal.value "
    echo echo "u"
    echo -n "dockerAdminTotal.value "
    echo echo "u"
    echo -n "dockerWebHealthy.value "
    echo echo "u"
    echo -n "dockerAdminHealthy.value "
    echo echo "u"

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

    tomcatWebTotal=0;
    tomcatAdminTotal=0;
    tomcatWebHealthy=0;
    tomcatAdminHealthy=0;
    curl -s https://$1/running_experiments.json | grep -E "\"" | sed "s/\"//g" |sed "s/,//g" | while read runningWar;
    do
        if [[ ${serviceList} != *$runningWar"_staging"* ]]; then
            # echo -e "location /$runningWar {\n proxy_pass https://tomcatstaging/$runningWar;\n}\n\nlocation /$runningWar-admin {\n proxy_pass https://tomcatstaging/$runningWar-admin;\n}\n" >> /usr/local/apache2/htdocs/frinex_tomcat_staging_locations.txt
            # healthResult=$(curl --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' $1/$serviceUrl$2/actuator/health)
            # if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
            #     healthCount=$[$healthCount +1]
            # else
            #     unknownCount=$[$unknownCount +1]
            # fi
        fi
    done
    echo "tomcatWebTotal.value $tomcatWebTotal"
    echo "tomcatAdminTotal.value $tomcatAdminTotal"
    echo "tomcatWebHealthy.value $tomcatWebHealthy"
    echo "tomcatAdminHealthy.value $tomcatAdminHealthy"
}

output_config() {
    echo "graph_title Frinex Tomcat Docker Ratio $0 $1 $2"
    echo "graph_category frinex"
    echo "tomcatWebTotal.label Tomcat Web Total"
    echo "tomcatAdminTotal.label Tomcat Admin Total"
    echo "tomcatWebHealthy.label Tomcat Web Healthy"
    echo "tomcatAdminHealthy.label Tomcat Admin Healthy"
    echo "dockerWebTotal.label Docket Web Total"
    echo "dockerAdminTotal.label Docket Admin Total"
    echo "dockerWebHealthy.label Docket Web Healthy"
    echo "dockerAdminHealthy.label Docket Admin Healthy"
}

update_data() {
    serverNameParts=${1//_/ }
    output_values $serverNameParts[0] $serverNameParts[1] $serverNameParts[2] > $dataDirectory/$1.values
    output_config $serverNameParts[0] $serverNameParts[1] $serverNameParts[2] > $dataDirectory/$1.config
}

output_usage() {
    printf >&2 "%s - munin plugin to show the ratio of experiments served by tomcat vs docker and the health of the nginx proxy and web application for each entry\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        touch $dataDirectory/${linkName#"tomcat_docker_ratio_"}.values
        cat $dataDirectory/${linkName#"tomcat_docker_ratio_"}.values
        update_data ${linkName#"tomcat_docker_ratio_"}&
        ;;
    1)
        case $1 in
            config)
                touch $dataDirectory/${linkName#"tomcat_docker_ratio_"}.config
                cat $dataDirectory/${linkName#"tomcat_docker_ratio_"}.config
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
