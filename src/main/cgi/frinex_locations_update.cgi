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
serviceList=$(sudo docker service ls \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' | sed 's/->8080\/tcp//g')

echo $serviceList \
    | grep -E "_admin|_web" \
    | grep -E "_production" \
    | awk '{print "location /" $2 " {\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
    | sed 's/_production_web {/ {/g' \
    | sed 's/_production_admin {/-admin {/g' \
    > /usr/local/apache2/htdocs/frinex_production_locations.txt

echo $serviceList \
    | grep -E "_production" \
    | awk '{print "upstream " $1 " {\n server lux22.mpi.nl:" $6 ";\n server lux23.mpi.nl:" $6 ";\n server lux25.mpi.nl:" $6 ";\n}\n"}' \
    > /usr/local/apache2/htdocs/frinex_production_upstreams.txt

echo $serviceList \
    | grep -E "_admin|_web" \
    | grep -E "_staging" \
    | awk '{print "location /" $2 " {\n proxy_pass http://" $1 "/" $2 ";\n}\n"}' \
    | sed 's/_staging_web {/ {/g' \
    | sed 's/_staging_admin {/-admin {/g' \
    > /usr/local/apache2/htdocs/frinex_staging_locations.txt

echo $serviceList \
    | grep -E "_staging" \
    | awk '{print "upstream " $1 " {\n server lux22.mpi.nl:" $6 ";\n server lux23.mpi.nl:" $6 ";\n server lux25.mpi.nl:" $6 ";\n}\n"}' \
    > /usr/local/apache2/htdocs/frinex_staging_upstreams.txt

echo '{"status": "ok"}'