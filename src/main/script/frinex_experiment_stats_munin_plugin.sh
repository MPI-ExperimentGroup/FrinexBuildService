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
# @since 30 March 2022 16:23 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script gets the stats of each experiment via the admin JSON REST interface.

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
dataDirectory=/srv/frinex_munin_data/stats

invalidate_stats() {
    for filePath in $dataDirectory/*_admin; do
        echo -en "totalParticipantsSeen.value U\ntotalDeploymentsAccessed.value U\ntotalPageLoads.value U\ntotalStimulusResponses.value U\ntotalMediaResponses.value U\ntotalDeletionEvents.value U\n" > $filePath 
    done
}

update_stats() {
    # invalidate_stats;
    hoststring=$(hostname -f)
    for currentUrl in $(curl --silent -H 'Content-Type: application/json' http://$hoststring/services.json \
    | grep -E "$1_admin" \
    | sed 's/"port":"//g' \
    | sed 's/["\{\}:,]//g' \
    | awk '{print ":" $4 "/" $1}' \
    | sed "s|_staging||g" | sed "s|_production||g" | sed "s|_admin|-admin|g" | sed "s|_web||g")
    do
        experimentAdminName=$(cut -d'/' -f2 <<< $currentUrl)
        #echo $experimentAdminName
        # changed --max-time 2 to --max-time 1 due to munin timeouts when NGINX fails on all experiments
        usageStatsResult=$(curl -k --connect-timeout 1 --max-time 1 --fail-early --silent -H 'Content-Type: application/json' http://$hoststring$currentUrl/public_quick_stats)
        if [[ $usageStatsResult == *"\"totalPageLoads\""* ]]; then
            echo $usageStatsResult | sed 's/[:]/.value /g' | sed 's/[,]/\n/g' | sed 's/[\{\}"]//g' | sed 's/null/U/g' > $dataDirectory/$experimentAdminName
            # cat $dataDirectory/$experimentAdminName
        else
            echo "http://$hoststring$currentUrl/public_quick_stats" >> $dataDirectory/failing_$(date +%F).log
        fi
            # echo "totalParticipantsSeen.label Participants Seen"
            # echo "totalDeploymentsAccessed.label Deployments Accessed"
            # echo "totalStimulusResponses.label Stimulus Responses"
            # echo "totalMediaResponses.label Media Responses"
    done
    output_values > $dataDirectory/output.values.tmp
    output_config > $dataDirectory/output.config.tmp
    mv -f $dataDirectory/output.config.tmp $dataDirectory/output.config
    mv -f $dataDirectory/output.values.tmp $dataDirectory/output.values
}

output_config() {
    for deployemntType in staging production
    do
        for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses totalDeletionEvents
        do
            echo "multigraph $deployemntType$graphType"
            echo "graph_title Frinex Docker $deployemntType $graphType"
            echo "graph_category frinex"
            echo "graph_total total $deployemntType $graphType"
            echo "graph_args --no-legend"
            for filePath in $dataDirectory/*$deployemntType"_admin"; do
                fileName=${filePath#"$dataDirectory/"}
                echo "$fileName.label $fileName"
                echo "$fileName.draw AREASTACK"
            done
        done
    done
}

output_values() {
    # TODO: cat and grep the values for the current grap from the temp files
    # TODO: If the plugin - for any reason - has no value to report, then it may send the value U for undefined. 
    for deployemntType in staging production
    do
        for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses
        do
            echo "multigraph $deployemntType$graphType"
            for filePath in $dataDirectory/*$deployemntType"_admin"; do
                fileName=${filePath#"$dataDirectory/"}
                value=$(grep $graphType $filePath | sed "s/$graphType/$fileName/g")
                if [ -z "$value" ]
                then
                    echo "$fileName.value U"
                else
                    echo $value
                fi
            done
        done
    done
}

output_usage() {
    printf >&2 "%s - munin plugin to show the usage statistics of Frinex experiments\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        touch $dataDirectory/output.values
        cat $dataDirectory/output.values
        update_stats&
        ;;
    1)
        case $1 in
            config)
                touch $dataDirectory/output.config
                cat $dataDirectory/output.config
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
