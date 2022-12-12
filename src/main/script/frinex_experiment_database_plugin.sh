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
# dataDirectory=$scriptDir/database_stats
# frinex_experiment_database_plugin.sh

output_config() {
    echo "multigraph $1_database_totals"
    echo "graph_title Frinex $1 Database Totals"
    echo "totalDeploymentsAccessed.label DeploymentsAccessed"
    echo "totalParticipantsSeen.label ParticipantsSeen"
    echo "totalPageLoads.label PageLoads"
    echo "totalStimulusResponses.label StimulusResponses"
    echo "totalMediaResponses.label MediaResponses"

    echo "multigraph $1_database_difference"
    echo "graph_title Frinex $1 Database Difference"
    echo "totalDeploymentsAccessed.label DeploymentsAccessed"
    echo "totalParticipantsSeen.label ParticipantsSeen"
    echo "totalPageLoads.label PageLoads"
    echo "totalStimulusResponses.label StimulusResponses"
    echo "totalMediaResponses.label MediaResponses"

    echo "multigraph $1_raw_totals"
    echo "graph_title Frinex $1 Raw Totals"
    echo "tag_data.label tag_data"
    echo "tag_pair_data.label tag_pair_data"
    echo "group_data.label group_data"
    echo "screen_data.label screen_data"
    echo "stimulus_response.label stimulus_response"
    echo "time_stamp.label time_stamp"
    echo "media_data.label media_data"

    echo "multigraph $1_raw_difference"
    echo "graph_title Frinex $1 Raw Difference"
    echo "tag_data.label tag_data"
    echo "tag_pair_data.label tag_pair_data"
    echo "group_data.label group_data"
    echo "screen_data.label screen_data"
    echo "stimulus_response.label stimulus_response"
    echo "time_stamp.label time_stamp"
    echo "media_data.label media_data"

    cat $dataDirectory/$1_subgraphs.config
}

run_localhost_queries() {
    #postgresCommand="psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging"
    postgresCommand="/Applications/Postgres.app/Contents/Versions/14/bin/psql -p5432"

    for currentexperiment in $($postgresCommand -d postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres' and datname like 'frinex_%_db'");
    do 
        experimentName=${currentexperiment%"_db"};
        experimentName=${experimentName#"frinex_"};
        echo -n $experimentName'.totalDeploymentsAccessed.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_value) from tag_data where event_tag = 'compileDate'";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.totalParticipantsSeen.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct user_id) from participant";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.totalPageLoads.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_date) from tag_data where event_tag = 'compileDate'";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.totalStimulusResponses.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct concat(tag_date, user_id, event_ms)) from stimulus_response";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.totalMediaResponses.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from audio_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.tag_data.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.tag_pair_data.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_pair_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.group_data.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from group_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.screen_data.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from screen_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.stimulus_response.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from stimulus_response";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'.time_stamp.value '
        PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from time_stamp";
    done
}

output_totals() {
    # sum the values and generate the totals graphs
    echo "multigraph $1_database_totals"
    # generate totals for each type
    for graphType in totalParticipantsSeen totalDeploymentsAccessed totalPageLoads totalStimulusResponses totalMediaResponses
    do
        cat $dataDirectory/query.values | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$graphType'.value " sum}'
    done
    echo "multigraph $1_raw_totals"
    # generate totals for each type
    for graphType in tag_data tag_pair_data group_data screen_data stimulus_response time_stamp media_data
    do
        cat $dataDirectory/query.values | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$graphType'.value " sum}'
    done
}

output_values() {
    case $1 in
        production)
            ;;
        staging)
            ;;
        *)
            run_localhost_queries > $dataDirectory/query.values
            ;;
    esac
    output_totals $1
    # cat $dataDirectory/graphs.values
    # cat $dataDirectory/subgraphs.values
}

output_usage() {
    printf >&2 "%s - munin plugin to graph the Frinex experiment database statistics\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

linkName=$(basename $0)
case $# in
    0)
        output_values ${linkName#"frinex_database_stats_"}
        ;;
    1)
        case $1 in
            config)
                output_config ${linkName#"frinex_database_stats_"}
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
