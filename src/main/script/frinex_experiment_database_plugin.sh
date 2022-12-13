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
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Database Totals"
    echo "$1_DeploymentsAccessed_total.label DeploymentsAccessed"
    echo "$1_ParticipantsSeen_total.label ParticipantsSeen"
    echo "$1_PageLoads_total.label PageLoads"
    echo "$1_StimulusResponses_total.label StimulusResponses"
    echo "$1_MediaResponses_total.label MediaResponses"

    echo "multigraph $1_database_difference"
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Database Difference"
    echo "$1_DeploymentsAccessed_diff.label DeploymentsAccessed"
    echo "$1_ParticipantsSeen_diff.label ParticipantsSeen"
    echo "$1_PageLoads_diff.label PageLoads"
    echo "$1_StimulusResponses_diff.label StimulusResponses"
    echo "$1_MediaResponses_diff.label MediaResponses"

    echo "multigraph $1_raw_totals"
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Raw Totals"
    echo "$1_tag_data_total.label tag_data"
    echo "$1_tag_pair_data_total.label tag_pair_data"
    echo "$1_group_data_total.label group_data"
    echo "$1_screen_data_total.label screen_data"
    echo "$1_stimulus_response_total.label stimulus_response"
    echo "$1_time_stamp_total.label time_stamp"
    echo "$1_media_data_total.label media_data"

    echo "multigraph $1_raw_difference"
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Raw Difference"
    echo "$1_tag_data_diff.label tag_data"
    echo "$1_tag_pair_data_diff.label tag_pair_data"
    echo "$1_group_data_diff.label group_data"
    echo "$1_screen_data_diff.label screen_data"
    echo "$1_stimulus_response_diff.label stimulus_response"
    echo "$1_time_stamp_diff.label time_stamp"
    echo "$1_media_data_diff.label media_data"

    # TODO: add subgraphs to allow inspection of individual experiment stats
    # cat $dataDirectory/$1_subgraphs.config
}

run_queries() {
    # CREATE ROLE munin_db_user WITH LOGIN PASSWORD 'ChangeThis459847';
    # postgresCommand="psql -p5432 -U munin_db_user"
    # postgresCommand="psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging"
    # postgresCommand="/Applications/Postgres.app/Contents/Versions/14/bin/psql -p5432"
    case $1 in
        production)
            postgresCommand="psql -p5434"
            ;;
        staging)
            postgresCommand="psql -p5433"
            ;;
        *)
            postgresCommand="psql -p5432"
            ;;
    esac
    
    for currentexperiment in $($postgresCommand -U munin_db_user -d postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres' and datname like 'frinex_%_db'");
    do 
        experimentName=${currentexperiment%"_db"};
        experimentName=${experimentName#"frinex_"};
        echo -n $experimentName'_DeploymentsAccessed.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_value) from tag_data where event_tag = 'compileDate'";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_ParticipantsSeen.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct user_id) from participant";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_PageLoads.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_date) from tag_data where event_tag = 'compileDate'";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_StimulusResponses.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct concat(tag_date, user_id, event_ms)) from stimulus_response";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_MediaResponses.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from audio_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_tag_data.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_tag_pair_data.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_pair_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_group_data.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from group_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_screen_data.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from screen_data";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_stimulus_response.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from stimulus_response";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_time_stamp.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from time_stamp";
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_media_data.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from audio_data";
        # TODO: add a query for the metadata table
        # TODO: consolidate these separate DB connections into a single DB connection for speed etc.
    done
}

output_totals() {
    # sum the values and generate the totals graphs
    echo "multigraph $1_database_totals"
    # generate totals for each type
    for graphType in ParticipantsSeen DeploymentsAccessed PageLoads StimulusResponses MediaResponses
    do
        cat $dataDirectory/$1_query.values | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$1_$graphType'_total.value " sum}'
    done
    echo "multigraph $1_raw_totals"
    # generate totals for each type
    for graphType in tag_data tag_pair_data group_data screen_data stimulus_response time_stamp media_data
    do
        cat $dataDirectory/$1_query.values | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$1_$graphType'_total.value " sum}'
    done
}

output_difference() {
    # diff the previous to values and generate the change per period graphs
    difference="$(diff --suppress-common-lines -y $dataDirectory/$1_query.previous $dataDirectory/$1_query.values | awk '{print $1, " ", $5-$2}')"
    echo "multigraph $1_database_difference"
    # generate difference for each type
    for graphType in ParticipantsSeen DeploymentsAccessed PageLoads StimulusResponses MediaResponses
    do
        echo $difference | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$1_$graphType'_diff.value " sum}'
    done
    echo "multigraph $1_raw_difference"
    # generate difference for each type
    for graphType in tag_data tag_pair_data group_data screen_data stimulus_response time_stamp media_data
    do
        echo $difference | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$1_$graphType'_diff.value " sum}'
    done
}

update_data() {
    lockFile=$dataDirectory/$1_lock_file.pid
    if [ ! -e $lockFile ]; then
        echo $BASHPID > $lockFile
        touch $dataDirectory/$1_query.previous
        touch $dataDirectory/$1_query.values
        run_queries $1 > $dataDirectory/$1_query.values
        output_totals $1 > $dataDirectory/$1_totals.values.tmp
        output_difference $1 > $dataDirectory/$1_difference.values.tmp
        mv $dataDirectory/$1_totals.values.tmp $dataDirectory/$1_totals.values
        mv $dataDirectory/$1_difference.values.tmp $dataDirectory/$1_difference.values
        # keep the current as the next prevous values
        cp -f $dataDirectory/$1_query.values $dataDirectory/$1_query.previous
        # cat $dataDirectory/graphs.values
        # cat $dataDirectory/subgraphs.values
        rm $lockFile
    fi
}

output_values() {
    cat $dataDirectory/$1_totals.values
    cat $dataDirectory/$1_difference.values
    (nohup nice $0 update > $dataDirectory/$1_update.log)&
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
            update)
                update_data ${linkName#"frinex_database_stats_"}
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
