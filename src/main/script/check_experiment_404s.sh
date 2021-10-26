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
echo $scriptDir

# grep any 404 lines, and extract the first element in the URL path that coresponds with the experiment name, then sanity check with grep again to filter out lines containing non alpha numeric characters, then remove duplicate names
possibleExperiment404s=$(sudo grep -E "GET /[[:alpha:]][[:alnum:]]{3,}/.*/.* 404" /var/log/tomcat/localhost_access_log.$(date +%F).txt | cut -d / -f 4 | grep -E "^[[:alpha:]][[:alnum:]]{3,}$" | uniq)
echo $possibleExperiment404s

for undeployedPath in `find /srv/tomcat/webapps/ -maxdepth 1 -mindepth 1 -type f -name *-admin.war.disabled -printf '%f\n'`
do
    echo $undeployedPath;
    undeployedExperimentName=${undeployedPath/-admin.war.disabled/}
    echo $undeployedExperimentName

    if [[ $possibleExperiment404s == *$undeployedExperimentName* ]]; then
        echo "Resurecting: $undeployedExperimentName"
        mv /srv/tomcat/webapps/$undeployedPath-admin.war.disabled /srv/tomcat/webapps/$undeployedPath-admin.war
        mv /srv/tomcat/webapps/$undeployedPath.war.disabled /srv/tomcat/webapps/$undeployedPath.war
    else
        echo "Nothing to do for: $undeployedExperimentName"
    fi
done
