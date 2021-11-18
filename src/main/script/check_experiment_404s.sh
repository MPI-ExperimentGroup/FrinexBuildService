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
# @since 26 October 2021 11:38 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script checks the tomcat logs for 404s on valid experiment paths and if a matching .war.disabled is 
# found the then the war file is renamed to trigger the redeployment of the experiment (both web and admin war files)
# This script could be run once per 10 minutes check 404s since a user might be waiting

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

lockFile=$scriptDir/check_experiment_404s.pid
if [ -e $lockFile ]; then
    lockFilePID=`cat $lockFile`
    if kill -0 $lockFilePID &>> $scriptDir/check_experiment_404s_$(date +%F).log; then
        echo "Existing process found, did not terminate, exiting" >> $scriptDir/check_experiment_404s_$(date +%F).log
        exit 1
    else
        rm $lockFile
        echo "Existing process terminated" >> $scriptDir/check_experiment_404s_$(date +%F).log
    fi
fi
echo $BASHPID > $lockFile
cat $lockFile >> $scriptDir/check_experiment_404s_$(date +%F).log
date >> $scriptDir/check_experiment_404s_$(date +%F).log
# grep any 404 lines, and extract the first element in the URL path that coresponds with the experiment name, then sanity check with grep again to filter out lines containing non alpha numeric characters, then remove duplicate names
# requests to /actuator/health are ignored because this would be the build page not an active user
possibleExperiment404sWithAdmin=$(sudo grep -E "GET /[a-z][a-z0-9_]{3,}(-admin)?/?.* .*/.* 404" /var/log/tomcat/localhost_access_log.$(date +%F).txt | grep -v "/health HTTP" | cut -d " " -f 7 | cut -d / -f 2 | grep -E "^[a-z][a-z0-9_]{3,}(-admin)?$" | sort | uniq | paste -sd "|")
possibleExperiment404s=$(echo "|$possibleExperiment404sWithAdmin|" | sed "s/-admin|/|/g")
#echo $possibleExperiment404s

for undeployedPath in `find /srv/tomcat/webapps/ -maxdepth 1 -mindepth 1 -type f -name *-admin.war.disabled -printf '%f\n'`
do
    #echo $undeployedPath;
    undeployedExperimentName=${undeployedPath/-admin.war.disabled/}
    #echo $undeployedExperimentName
    if [ -d /srv/tomcat/webapps/$undeployedExperimentName/ ]; then
        echo "Stray directory found: $undeployedExperimentName" >> $scriptDir/check_experiment_404s_$(date +%F).log
    fi
    if [ -d /srv/tomcat/webapps/$undeployedExperimentName-admin/ ]; then
        echo "Stray directory found: $undeployedExperimentName-admin" >> $scriptDir/check_experiment_404s_$(date +%F).log
    fi
    # if both .war.disabled and .war files exist then delete .war.disabled because it will be out of date
    if [ -f /srv/tomcat/webapps/$undeployedExperimentName.war ]; then
        echo "Existing $undeployedExperimentName.war found, will not resurect, deleting .war.disabled files." >> $scriptDir/check_experiment_404s_$(date +%F).log
        sudo rm /srv/tomcat/webapps/$undeployedExperimentName-admin.war.disabled
        sudo rm /srv/tomcat/webapps/$undeployedExperimentName.war.disabled
    else
        if [[ "$possibleExperiment404s" == *"|$undeployedExperimentName|"* ]]; then
            #echo "Resurecting: $undeployedExperimentName"
            echo "Resurecting: $undeployedExperimentName" >> $scriptDir/check_experiment_404s_$(date +%F).log
            sudo mv /srv/tomcat/webapps/$undeployedExperimentName-admin.war.disabled /srv/tomcat/webapps/$undeployedExperimentName-admin.war
            sudo mv /srv/tomcat/webapps/$undeployedExperimentName.war.disabled /srv/tomcat/webapps/$undeployedExperimentName.war
        #else
        #    echo "Nothing to do for: $undeployedExperimentName"
        fi
    fi
done
date >> $scriptDir/check_experiment_404s_$(date +%F).log
rm $lockFile
