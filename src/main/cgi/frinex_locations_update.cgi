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
# @since 5 April 2022 15:58 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates nginx configuraiton fragments as static files to be served via HTTPD

echo "Content-type: text/json"
echo ''
# this | grep -v -E " 0/" \ is there to bypas docker when the services have not come up, if they are runing on tomcat they will be sent there
serviceList="$(sudo docker service ls \
    | grep -E "8080/tcp" \
    | grep -v -E " 0/" \
    | sed 's/[*:]//g' | sed 's/->8080\/tcp//g')"

echo "$serviceList" \
    | grep -E "_admin|_web" \
    | grep -E "_production" \
    | awk '{print "location /" $2 " {\n proxy_http_version 1.1;\n proxy_set_header Upgrade $http_upgrade;\n proxy_set_header Connection \"upgrade\";\n proxy_set_header Host $http_host;\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
    | sed 's/_production_web {/ {/g' \
    | sed 's/_production_admin {/-admin {/g' \
    > /usr/local/apache2/htdocs/frinex_production_locations.txt

echo "$serviceList" \
    | grep -E "_production" \
    | awk '{print "upstream " $1 " {\n server lux27.mpi.nl:" $6 ";\n server lux28.mpi.nl:" $6 ";\n server lux29.mpi.nl:" $6 ";\n}\n"}' \
    > /usr/local/apache2/htdocs/frinex_production_upstreams.txt

# | awk '{print "location /" $2 "X {\n proxy_pass http://" $1 "/" $2 "X;\n proxy_set_header X-Forwarded-Prefix /" $2 "X;\n proxy_set_header X-Forwarded-Host tomcatstaging;\n proxy_set_header X-Forwarded-Proto https;\n proxy_set_header X-Forwarded-Port 443;\n}\n location /" $2 " {\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
echo "$serviceList" \
    | grep -E "_admin|_web" \
    | grep -E "_staging" \
    | awk '{print "location /" $2 "X {\n proxy_http_version 1.1;\n proxy_set_header Upgrade $http_upgrade;\n proxy_set_header Connection \"upgrade\";\n proxy_set_header Host $http_host;\n proxy_pass http://" $1 "/" $2 "X;\n}\n"}' \
    | sed 's/_staging_webX//g' \
    | sed 's/_staging_adminX/-admin/g' \
    > /usr/local/apache2/htdocs/frinex_staging_locations.txt

echo "$serviceList" \
    | grep -E "_staging" \
    | awk '{print "upstream " $1 " {\n server lux27.mpi.nl:" $6 ";\n server lux28.mpi.nl:" $6 ";\n server lux29.mpi.nl:" $6 ";\n}\n"}' \
    > /usr/local/apache2/htdocs/frinex_staging_upstreams.txt

echo "" > /usr/local/apache2/htdocs/frinex_tomcat_staging_locations.txt
# for runningWar in $(curl -k -s https://ems15.mpi.nl/running_experiments.json | grep -E "\"" | sed "s/\"//g" |sed "s/,//g")
# do
#     if [[ ${serviceList} != *$runningWar"_staging_web"* ]]; then
#         echo -e "location /$runningWar {\n proxy_pass https://tomcatstaging/$runningWar;\n}\n" >> /usr/local/apache2/htdocs/frinex_tomcat_staging_locations.txt
#     fi
#     if [[ ${serviceList} != *$runningWar"_staging_admin"* ]]; then
#         echo -e "location /$runningWar-admin {\n proxy_pass https://tomcatstaging/$runningWar-admin;\n}\n" >> /usr/local/apache2/htdocs/frinex_tomcat_staging_locations.txt
#     fi
# done

experimentList="$(ls /FrinexBuildService/protected/*/*.war | sed 's|^/FrinexBuildService/protected/[^/]*/||g' | sed 's/\.war//g')"
echo "$experimentList" | sort > /usr/local/apache2/htdocs/frinex_all_experiments.txt
echo "$serviceList" | awk '{print $2}' | sort > /usr/local/apache2/htdocs/frinex_runnning_experiments.txt
comm -2 -3 /usr/local/apache2/htdocs/frinex_all_experiments.txt /usr/local/apache2/htdocs/frinex_runnning_experiments.txt | sed 's/_admin$/-admin/g' | sed 's/_web$//g' > /usr/local/apache2/htdocs/frinex_stopped_experiments.txt
#  | sed 's/_production_admin/_production-admin/g' | sed 's/_staging_admin/_staging-admin/g'
awk 'BEGIN {printf "location ^~ ("} {printf $0 "|"} END {printf ") {\nproxy_pass https://frinexbuild:8010/cgi-bin/frinex_restart_experient.cgi?$1;\n}\n"}' /usr/local/apache2/htdocs/frinex_stopped_experiments.txt | sed 's/||/|/g' | sed 's/(|/(/g' | sed 's/|)/)/g' > /usr/local/apache2/htdocs/frinex_stopped_locations.txt

echo '{"status": "ok"}'
