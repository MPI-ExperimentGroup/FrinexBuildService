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
if [ -f /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.war ]; then
    if  [ "$QUERY_STRING" == "$cleanedInput&actuator/health" ] || [ "$QUERY_STRING" == "$cleanedInput&health" ]; then
        echo "{"status":"sleeping"}"
        # echo "$(date), status, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
    else
        serviceStatus=$(sudo docker service ls | grep $cleanedInput | grep "1/1" | awk '{print $3}')
        # publishedPort=$(docker service ls | grep $cleanedInput | awk '{print $6}')
        echo "serviceStatus: $serviceStatus<br>"
        # echo "publishedPort: $publishedPort<br>"
        if [ "$serviceStatus" == "replicated" ]; then
            echo "Proxy update<br>"
            curl -k PROXY_UPDATE_TRIGGER  &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Please reload this page in a few minutes<br>"
            echo "<button onClick=\"window.location.reload();\">Refresh Page</button>"
            # todo: it is still possible for the participant to get stuck if they reload at the moment they can get a 502 error, so it might be best to use JS to ping the URL and wait for the service to be responding before allowing the button to be clicked
        else 
            echo "Restarting  $cleanedInput<br>"
            echo "$(date), restarting, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # echo "dockerServiceOptions: DOCKER_SERVICE_OPTIONS;"
            # echo "dockerRegistry: DOCKER_REGISTRY;"
            # build an alternative service to compare memory usage
            # comparisonServiceName=$(echo "$cleanedInput" | sed 's/_production_web$/_alpine_production_web/g'| sed 's/_production_admin$/_alpine_production_admin/g' | sed 's/_staging_web$/_alpine_staging_web/g'| sed 's/_staging_admin$/_alpine_staging_admin/g')
            # comparisonContextPath=$(echo "$cleanedInput" | sed 's/_production_web$/_alpine/g'| sed 's/_production_admin$/_alpine-admin/g' | sed 's/_staging_web$/_alpine/g'| sed 's/_staging_admin$/_alpine-admin/g')
            contextPath=$(echo "$cleanedInput" | sed 's/_production_web$//g'| sed 's/_production_admin$/-admin/g' | sed 's/_staging_web$//g'| sed 's/_staging_admin$/-admin/g')
            # only the web component has the compile date so this is used for the tag of both admin and web images
            imageDateTag=$(unzip -p /FrinexBuildService/protected/$experimentDirectory/$(echo "$cleanedInput.war" | sed "s/_admin.war/_web.war/g") version.json | grep compileDate | sed "s/[^0-9]//g")
            
            # because this Docker file is out of date (for example does not have --nl.mpi.tg.eg.frinex.informReadyUrl) this section has been omitted and we now expect the Docker file to always exist
            # echo "imageDateTag: $imageDateTag"
            # echo "FROM eclipse-temurin:21-jdk-alpine" > /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker
            # echo "COPY $cleanedInput.war /$cleanedInput.war" >> /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker
            # echo "CMD [\"java\", \"-jar\", \"/$cleanedInput.war\", \"--server.servlet.context-path=/$contextPath\", \"--server.forward-headers-strategy=FRAMEWORK\"]" >> /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker
            
            # chmod a+rwx /FrinexBuildService/protected/$experimentDirectory/$comparisonServiceName.Docker &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # cat /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # cat /FrinexBuildService/protected/$experimentDirectory/$comparisonServiceName.Docker &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # ls -l /FrinexBuildService/protected/$experimentDirectory/ &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Building<br>"
            sudo docker build --no-cache --force-rm -f /FrinexBuildService/protected/$experimentDirectory/$cleanedInput.Docker -t DOCKER_REGISTRY/$cleanedInput:$imageDateTag /FrinexBuildService/protected/$experimentDirectory &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # sudo docker build --no-cache -f /FrinexBuildService/protected/$experimentDirectory/$comparisonServiceName.Docker -t DOCKER_REGISTRY/$comparisonServiceName:$imageDateTag /FrinexBuildService/protected/$experimentDirectory &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Pushing<br>"
            sudo docker push DOCKER_REGISTRY/$cleanedInput:$imageDateTag &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # sudo docker push DOCKER_REGISTRY/$comparisonServiceName:$imageDateTag &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Cleaning up<br>"
            sudo docker service ls --format '{{.Name}}' | grep -Ei "^${cleanedInput}[_0-9]+" | xargs -r sudo docker service rm &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # sudo docker service rm $cleanedInput &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # sudo docker service rm $comparisonServiceName &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            instanceCount=$(sudo docker service ls | grep "$cleanedInput" | wc -l)
            lineNumber=$(grep -n -m1 "$cleanedInput" /FrinexBuildService/artifacts/ports.txt | cut -d: -f1);
            if [ -z "$lineNumber" ]; then
                echo "$cleanedInput" >> /FrinexBuildService/artifacts/ports.txt
                lineNumber=$(wc -l < /FrinexBuildService/artifacts/ports.txt)
                # synchronise ports.txt to the other swarm nodes
                bash /FrinexBuildService/script/sync_delete_from_swarm_nodes.sh /FrinexBuildService/artifacts/ports.txt &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            fi
            echo "lineNumber: $lineNumber" &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            hostPort=$(( 10000 + (lineNumber * 20) + $instanceCount ))
            echo "hostPort: $hostPort" &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "imageDateTag: $imageDateTag" &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Starting<br>"
            sudo docker service create --name ${cleanedInput}_${instanceCount} DOCKER_SERVICE_OPTIONS -d --publish mode=host,target=8080,published=$hostPort DOCKER_REGISTRY/$cleanedInput:$imageDateTag &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            sudo docker system prune -f &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            # sudo docker service create --name $comparisonServiceName DOCKER_SERVICE_OPTIONS -d -p 8080 DOCKER_REGISTRY/$comparisonServiceName:$imageDateTag &>> /usr/local/apache2/htdocs/frinex_restart_experient.log
            echo "Please reload this page in a few minutes<br>"
            echo "<button onClick=\"window.location.reload();\">Refresh Page</button>"
        fi
    fi
else
    echo "The experiment $cleanedInput does not exist."
    echo "$(date), not found, $cleanedInput, $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
fi
