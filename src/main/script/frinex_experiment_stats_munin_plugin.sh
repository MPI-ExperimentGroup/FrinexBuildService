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
dataDirectory=/srv/frinex_munin_data

output_config() {
    hoststring=$(hostname -f)
    for currentUrl in $(curl --silent -H 'Content-Type: application/json' http://$hoststring/services.json \
    | grep -E "$1_admin" \
    | sed 's/"port":"//g' \
    | sed 's/["\{\}:,]//g' \
    | awk '{print ":" $4 "/" $1}')
    do
        experimentAdminName=$(cut -d'/' -f2 <<< $currentUrl)
        #echo $experimentAdminName
        usageStatsResult=$(curl --connect-timeout 1 --silent -H 'Content-Type: application/json' http://$hoststring$currentUrl/public_quick_stats)
        if [[ $usageStatsResult == *"\"totalPageLoads\""* ]]; then
            echo $usageStatsResult | sed 's/[:]/.value /g' | sed 's/[,]/\n/g' | sed 's/[\{\}"]//g' > $dataDirectory/$experimentAdminName
            # cat $dataDirectory/$experimentAdminName
        fi
            # echo "totalParticipantsSeen.label Participants Seen"
            # echo "totalDeploymentsAccessed.label Deployments Accessed"
            # echo "totalStimulusResponses.label Stimulus Responses"
            # echo "totalMediaResponses.label Media Responses"
    done
    for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses
    do
        echo "multigraph $graphType"
        echo "graph_title Frinex Experiments $graphType"
        echo "graph_category frinex"
        for filename in $dataDirectory; do
        echo "$filename.label $filename"
    done
}

output_values() {
    # TODO: cat and grep the values for the current grap from the temp files
    echo "with_stimulus_example_production_admin.value 0"
}

output_usage() {
    printf >&2 "%s - munin plugin to show the usage statistics of Frinex experiments\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

case $# in
    0)
        output_values
        ;;
    1)
        case $1 in
            config)
                output_config 
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
