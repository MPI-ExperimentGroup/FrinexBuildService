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
# @since 21 July 2022 15:48 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script gets the stats of the specified externally hosted experiment the admin JSON REST interface.

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
linkName=$(basename $0)
dataDirectory=/srv/frinex_munin_data/frinex_external_experiment_stats

invalidate_stats() {
    for filePath in $dataDirectory/*-admin; do
        echo -en "totalParticipantsSeen.value U\ntotalDeploymentsAccessed.value U\ntotalPageLoads.value U\ntotalStimulusResponses.value U\ntotalMediaResponses.value U\n" > $filePath
    done
}

update_stats() {
    pluginInstance=$1
    hoststring=$(echo $pluginInstance | awk -F_ '{print $1 "://" $2 ":" $3}')
    experimentName=${pluginInstance#$hoststring"_"}
    echo "$pluginInstance" >> $dataDirectory/$pluginInstance.log
    echo "$hoststring" >> $dataDirectory/$pluginInstance.log
    echo "$experimentName" >> $dataDirectory/$pluginInstance.log
    echo "$hoststring/$experimentName/public_quick_stats" >> $dataDirectory/$pluginInstance.log
    if test -f $dataDirectory/$pluginInstance.lock; then
        date >> $dataDirectory/$pluginInstance.log
        echo " lock file found" >> $dataDirectory/$pluginInstance.log
        if [ "$(find $dataDirectory/$pluginInstance.lock -mmin +60)" ]; then 
            rm $dataDirectory/$pluginInstance.lock
            echo "lock file expired" >> $dataDirectory/$pluginInstance.log
        fi
    else
        touch $dataDirectory/$pluginInstance.lock
        usageStatsResult=$(curl --connect-timeout 1 --max-time 2 --fail-early --silent -H 'Content-Type: application/json' $hoststring/$experimentName/public_quick_stats)
        if [[ $usageStatsResult == *"\"totalPageLoads\""* ]]; then
            echo $usageStatsResult | sed 's/[:]/.value /g' | sed 's/[,]/\n/g' | sed 's/[\{\}"]//g' | sed 's/null/U/g' > $dataDirectory/$pluginInstance
        fi
        cat $dataDirectory/$pluginInstance > $dataDirectory/$pluginInstance.values.tmp
        output_config $pluginInstance > $dataDirectory/$pluginInstance.config.tmp
        mv -f $dataDirectory/$pluginInstance.config.tmp $dataDirectory/$pluginInstance.config
        mv -f $dataDirectory/$pluginInstance.values.tmp $dataDirectory/$pluginInstance.values
        rm $dataDirectory/$pluginInstance.lock
    fi
}

output_config() {
    echo "graph_title Frinex External $1"
    echo "graph_category frinex"
    for labelName in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses; do
        echo "$labelName.label $labelName"
    done
}

output_usage() {
    printf >&2 "%s - munin plugin to show the usage statistics of Frinex experiments that are hosted externally\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        touch $dataDirectory/${linkName#"frinex_external_experiment_stats_"}.values
        cat $dataDirectory/${linkName#"frinex_external_experiment_stats_"}.values
        update_stats ${linkName#"frinex_external_experiment_stats_"}&
        ;;
    1)
        case $1 in
            config)
                touch $dataDirectory/${linkName#"frinex_external_experiment_stats_"}.config
                cat $dataDirectory/${linkName#"frinex_external_experiment_stats_"}.config
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
