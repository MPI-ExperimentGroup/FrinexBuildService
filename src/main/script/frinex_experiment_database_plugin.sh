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
# @since 08 December 2022 11:43 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This munin plugin gets Frinex experiment stats directly from the databases bypassing the webservices

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
dataDirectory=/srv/frinex_munin_data/database_stats
# frinex_experiment_database_plugin.sh

output_config() {
    echo "multigraph database_totals"
    echo "graph_title Frinex Database Totals"
    echo "totalDeploymentsAccessed.label DeploymentsAccessed"
    echo "totalParticipantsSeen.label ParticipantsSeen"
    echo "totalPageLoads.label PageLoads"
    echo "totalStimulusResponses.label StimulusResponses"
    echo "totalMediaResponses.label MediaResponses"

    echo "multigraph database_difference"
    echo "graph_title Frinex Database Difference"
    echo "totalDeploymentsAccessed.label DeploymentsAccessed"
    echo "totalParticipantsSeen.label ParticipantsSeen"
    echo "totalPageLoads.label PageLoads"
    echo "totalStimulusResponses.label StimulusResponses"
    echo "totalMediaResponses.label MediaResponses"

    echo "multigraph raw_totals"
    echo "graph_title Frinex Raw Totals"
    echo "tag_data.label tag_data"
    echo "tag_pair_data.label tag_pair_data"
    echo "group_data.label group_data"
    echo "screen_data.label screen_data"
    echo "stimulus_response.label stimulus_response"
    echo "time_stamp.label time_stamp"
    echo "media_data.label media_data"

    echo "multigraph raw_difference"
    echo "graph_title Frinex Raw Difference"
    echo "tag_data.label tag_data"
    echo "tag_pair_data.label tag_pair_data"
    echo "group_data.label group_data"
    echo "screen_data.label screen_data"
    echo "stimulus_response.label stimulus_response"
    echo "time_stamp.label time_stamp"
    echo "media_data.label media_data"

    cat $dataDirectory/subgraphs.config
}

output_values() {
    cat $dataDirectory/graphs.values
    cat $dataDirectory/subgraphs.values
}

output_usage() {
    printf >&2 "%s - munin plugin to graph the Frinex experiment database statistics\n" ${0##*/}
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
