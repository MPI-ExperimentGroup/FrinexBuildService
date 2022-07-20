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
# @since 04 May 2022 13:06 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script gets the stats of each experiment in tomcat via the admin JSON REST interface.

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
linkName=$(basename $0)
dataDirectory=/srv/frinex_munin_data/stats_tomcat_${linkName#"frinex_experiment_stats_"}

invalidate_stats() {
    for filePath in $dataDirectory/*-admin; do
        echo -en "totalParticipantsSeen.value U\ntotalDeploymentsAccessed.value U\ntotalPageLoads.value U\ntotalStimulusResponses.value U\ntotalMediaResponses.value U\n" > $filePath
    done
}

update_stats() {
    hoststring=$1
    if test -f $dataDirectory/$hoststring.lock; then
        date >> $dataDirectory/$hoststring.log
        echo " lock file found" >> $dataDirectory/$hoststring.log
        if [ "$(find $dataDirectory/$hoststring.lock -mmin +60)" ]; then 
            rm $dataDirectory/$hoststring.lock
            echo "lock file expired" >> $dataDirectory/$hoststring.log
        fi
    else
        touch $dataDirectory/$hoststring.lock
        # invalidate_stats;
        for experimentName in $(curl -k --silent -H 'Content-Type: application/json' http://$hoststring/running_experiments.json | grep -v '}' | grep -v '{' | sed 's/"//g' | sed 's/,//g')
        do
            usageStatsResult=$(curl --connect-timeout 1 --max-time 2 --fail-early --silent -H 'Content-Type: application/json' http://$hoststring/$experimentName-admin/public_quick_stats)
            if [[ $usageStatsResult == *"\"totalPageLoads\""* ]]; then
                echo $usageStatsResult | sed 's/[:]/.value /g' | sed 's/[,]/\n/g' | sed 's/[\{\}"]//g' | sed 's/null/U/g' > $dataDirectory/$experimentName-admin
            fi
        done
        output_values $hoststring > $dataDirectory/$hoststring.values.tmp
        output_config $hoststring > $dataDirectory/$hoststring.config.tmp
        mv -f $dataDirectory/$hoststring.config.tmp $dataDirectory/$hoststring.config
        mv -f $dataDirectory/$hoststring.values.tmp $dataDirectory/$hoststring.values
        rm $dataDirectory/$hoststring.lock
    fi
}

output_config() {
    for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses
    do
        echo "multigraph $1_$graphType"
        echo "graph_title Frinex Tomcat $1 $graphType"
        echo "graph_category frinex"
        echo "graph_total total $1 $graphType"
        echo "graph_args --no-legend"        
        for filePath in $dataDirectory/*-admin; do
            fileName=${filePath#"$dataDirectory/"}
            echo "$fileName.label $fileName"
            echo "$fileName.draw AREASTACK"
        done
    done
}

output_values() {
    # TODO: cat and grep the values for the current grap from the temp files
    # TODO: If the plugin - for any reason - has no value to report, then it may send the value U for undefined. 
    for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses
    do
        echo "multigraph $1_$graphType"
        for filePath in $dataDirectory/*-admin; do
            fileName=${filePath#"$dataDirectory/"}
            grep $graphType $filePath | sed "s/$graphType/$fileName/g"
        done
    done
}

output_usage() {
    printf >&2 "%s - munin plugin to show the usage statistics of Frinex experiments\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        touch $dataDirectory/${linkName#"frinex_experiment_stats_"}.values
        cat $dataDirectory/${linkName#"frinex_experiment_stats_"}.values
        update_stats ${linkName#"frinex_experiment_stats_"}&
        ;;
    1)
        case $1 in
            config)
                touch $dataDirectory/${linkName#"frinex_experiment_stats_"}.config
                cat $dataDirectory/${linkName#"frinex_experiment_stats_"}.config
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
