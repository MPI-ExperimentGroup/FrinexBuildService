#!/bin/bash
#
# Copyright (C) 2021 Max Planck Institute for Psycholinguistics
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
# @since 24 May 2022 16:03 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates a NGINX locations file of experiment services running on tomcat but not in the Docker swarm

echo "Content-type: text/json"
echo ''
runningServices=$(sudo docker service ls | grep -E "_admin|_web" | grep -E "_staging" | grep -E "8080/tcp")
curl https://tomcatstaging/running_experiments.json | grep -E "\"" | sed "s/\"//g" |sed "s/,//g" | while read runningWar;
do
    if [[ ${runningServices} != *$runningWar"_staging"* ]];then
        echo "location /$runningWar {"
        echo " proxy_pass http://tomcatstaging/$runningWar;"
        echo "}"
        echo ""
        echo "location /$runningWar-admin {"
        echo " proxy_pass http://tomcatstaging/$runningWar-admin;"
        echo "}"
    fi
done
