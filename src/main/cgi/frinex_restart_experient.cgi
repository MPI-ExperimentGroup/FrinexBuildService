#!/bin/bash
#
# Copyright (C) 2024 Max Planck Institute for Psycholinguistics
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
# @since 18 April 2024 13:59 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script restarts experiment services when accessed by a user via nginx
echo "Content-type: text/html"
echo ''
cleanedInput=$(echo "$QUERY_STRING" | sed -En 's/([0-9a-z_]+).*/\1/p')
experimentDirectory=$(echo "$cleanedInput" | sed 's/_production_web$//g'| sed 's/_production_admin$//g' | sed 's/_staging_web$//g'| sed 's/_staging_admin$//g')
if [ -f /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker ]; then
    if  [ "$QUERY_STRING" == "$cleanedInput&actuator/health" ] || [ "$QUERY_STRING" == "$cleanedInput&health" ] ;
    then
        echo "{"status":"sleeping"}"
        echo "$(date), status, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
    else
        echo "Restarting  $cleanedInput<br>"
        echo "$(date), restarting, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
        # echo "dockerServiceOptions: DOCKER_SERVICE_OPTIONS;"
        # echo "dockerRegistry: DOCKER_REGISTRY;"
        echo "Building<br>"
        sudo docker build --no-cache -f /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker -t DOCKER_REGISTRY/$cleanedInput:stable /FrinexBuildService/protected/$experimentDirectory &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
        echo "Pushing<br>"
        sudo docker push DOCKER_REGISTRY/$cleanedInput:stable &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
        echo "Cleaning up<br>"
        sudo docker service rm $cleanedInput &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
        echo "Starting<br>"
        sudo docker service create --name $cleanedInput DOCKER_SERVICE_OPTIONS -d -p 8080 DOCKER_REGISTRY/$cleanedInput:stable &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
        echo "Ready, please reload this page<br>"
        # echo "<script>location.reload()</script>"
    fi
else
    echo "The experiment $cleanedInput does not exist."
    echo "$(date), not found, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
fi
