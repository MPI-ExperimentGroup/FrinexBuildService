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
# @since 29 October 2021 12:48 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script checks the tomcat logs for experiments that have not been used in N days (eg the last two calendar months)
# if there has been no access and if the designated date in the configuration file has expired then the 
# experiment is undeployed by renaming the war file .war.disabled
# The tomcat logs are then checked for 404s on valid experiment paths and if a matching .war.disabled is 
# found the then the war file is renamed to trigger the redeployment of the experiment (both web and admin war files)

# once per week check the last 30 days access
# only the admin needs to be checked for last access since the web component will always send data to the admin

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

lockFile=$scriptDir/check_deployment_dates.pid
if [ -e $lockFile ]; then
    lockFilePID=`cat $lockFile`
    if kill -0 $lockFilePID &>> $scriptDir/check_deployment_dates_$(date +%F).log; then
        echo "Existing process found, did not terminate, exiting" >> $scriptDir/check_deployment_dates_$(date +%F).log
        exit 1
    else
        rm $lockFile
        echo "Existing process terminated" >> $scriptDir/check_deployment_dates_$(date +%F).log
    fi
fi
echo $BASHPID > $lockFile
cat $lockFile >> $scriptDir/check_deployment_dates_$(date +%F).log
date >> $scriptDir/check_deployment_dates_$(date +%F).log

daysWithoutUse=15
inUseCounter=0
canSleepCounter=0
# find all admin war files that were deployed -mtime +7 days or more ago and consider them for sleep mode
for deployedPath in `find /srv/tomcat/webapps/ -maxdepth 1 -mindepth 1 -type f -mtime +$daysWithoutUse -name *-admin.war -printf '%f\n'`
do
    #echo $deployedPath;
    runningExperimentName=${deployedPath/-admin.war/}
    #echo $runningExperimentName
    for dayOffset in $(seq 0 $daysWithoutUse)
    do
        #echo $dayOffset
        if sudo grep --quiet "/$runningExperimentName/" /var/log/tomcat/localhost_access_log.$(date -d "$d - $dayOffset day" +%F).txt; then
            echo "$runningExperimentName has been used $dayOffset days ago on the $(date -d "$d - $dayOffset day" +%F)" >> $scriptDir/check_deployment_dates_$(date +%F).log
            let "inUseCounter++"
            break
        elif [ $dayOffset -eq $daysWithoutUse ]; then
            echo "$runningExperimentName not used in $dayOffset days, sending to sleep" >> $scriptDir/check_deployment_dates_$(date +%F).log
            let "canSleepCounter++"
            sudo mv /srv/tomcat/webapps/$runningExperimentName-admin.war /srv/tomcat/webapps/$runningExperimentName-admin.war.disabled
            sudo mv /srv/tomcat/webapps/$runningExperimentName.war /srv/tomcat/webapps/$runningExperimentName.war.disabled
        fi
    done
done

echo "$inUseCounter in use" >> $scriptDir/check_deployment_dates_$(date +%F).log
echo "$canSleepCounter can sleep" >> $scriptDir/check_deployment_dates_$(date +%F).log

date >> $scriptDir/check_deployment_dates_$(date +%F).log
rm $lockFile
