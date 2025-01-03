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

    echo "multigraph $1_database_counters"
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Database Per Hour"
    echo "graph_period hour"
    echo "$1_DeploymentsAccessed_counter.label DeploymentsAccessed"
    echo "$1_DeploymentsAccessed_counter.type COUNTER"
    # echo "$1_DeploymentsAccessed_counter.graph_period hour"
    echo "$1_ParticipantsSeen_counter.label ParticipantsSeen"
    echo "$1_ParticipantsSeen_counter.type COUNTER"
    # echo "$1_ParticipantsSeen_counter.graph_period hour"
    echo "$1_PageLoads_counter.label PageLoads"
    echo "$1_PageLoads_counter.type COUNTER"
    # echo "$1_PageLoads_counter.graph_period hour"
    echo "$1_StimulusResponses_counter.label StimulusResponses"
    echo "$1_StimulusResponses_counter.type COUNTER"
    # echo "$1_StimulusResponses_counter.graph_period hour"
    echo "$1_MediaResponses_counter.label MediaResponses"
    echo "$1_MediaResponses_counter.type COUNTER"
    # echo "$1_MediaResponses_counter.graph_period hour"

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
    echo "$1_metadata_total.label metadata"

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
    echo "$1_metadata_diff.label metadata"

    echo "multigraph $1_raw_counters"
    echo "graph_category frinex"
    echo "graph_title Frinex $1 Raw Per Hour"
    echo "graph_period hour"
    echo "$1_tag_data_counter.label tag_data"
    echo "$1_tag_data_counter.type COUNTER"
    # echo "$1_tag_data_counter.graph_period hour"
    echo "$1_tag_pair_data_counter.label tag_pair_data"
    echo "$1_tag_pair_data_counter.type COUNTER"
    # echo "$1_tag_pair_data_counter.graph_period hour"
    echo "$1_group_data_counter.label group_data"
    echo "$1_group_data_counter.type COUNTER"
    # echo "$1_group_data_counter.graph_period hour"
    echo "$1_screen_data_counter.label screen_data"
    echo "$1_screen_data_counter.type COUNTER"
    # echo "$1_screen_data_counter.graph_period hour"
    echo "$1_stimulus_response_counter.label stimulus_response"
    echo "$1_stimulus_response_counter.type COUNTER"
    # echo "$1_stimulus_response_counter.graph_period hour"
    echo "$1_time_stamp_counter.label time_stamp"
    echo "$1_time_stamp_counter.type COUNTER"
    # echo "$1_time_stamp_counter.graph_period hour"
    echo "$1_media_data_counter.label media_data"
    echo "$1_media_data_counter.type COUNTER"
    # echo "$1_media_data_counter.graph_period hour"
    echo "$1_metadata_counter.label metadata"
    echo "$1_metadata_counter.type COUNTER"
    # echo "$1_metadata_counter.graph_period hour"

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
        echo "" # if the table does not exist then we miss the new line which breaks the next query output
        echo -n $experimentName'_metadata.value '
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from participant";
        # TODO: consolidate these separate DB connections into a single DB connection for speed etc.
    done
}

run_queries_union() {
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
        $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '"$experimentName"_DeploymentsAccessed.value ' ||  count(distinct tag_value) from tag_data where event_tag = 'compileDate'\
        union select '"$experimentName"_ParticipantsSeen.value ' || count(distinct user_id) from participant \
        union select '"$experimentName"_PageLoads.value ' || count(distinct tag_date) from tag_data where event_tag = 'compileDate' \
        union select '"$experimentName"_StimulusResponses.value ' || count(distinct concat(tag_date, user_id, event_ms)) from stimulus_response \
        union select '"$experimentName"_MediaResponses.value ' || count(id) from audio_data \
        union select '"$experimentName"_tag_data.value ' || count(id) from tag_data \
        union select '"$experimentName"_tag_pair_data.value ' ||  count(id) from tag_pair_data \
        union select '"$experimentName"_group_data.value ' ||  count(id) from group_data \
        union select '"$experimentName"_screen_data.value ' || count(id) from screen_data \
        union select '"$experimentName"_stimulus_response.value ' || count(id) from stimulus_response \
        union select '"$experimentName"_time_stamp.value ' || count(id) from time_stamp \
        union select '"$experimentName"_media_data.value ' || count(id) from audio_data \
        union select '"$experimentName"_metadata.value ' || count(id) from participant";
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
    for graphType in tag_data tag_pair_data group_data screen_data stimulus_response time_stamp media_data metadata
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
    for graphType in tag_data tag_pair_data group_data screen_data stimulus_response time_stamp media_data metadata
    do
        echo $difference | grep $graphType | awk 'BEGIN{sum=0} {sum=sum+$2} END{print "'$1_$graphType'_diff.value " sum}'
    done
}

update_data() {
    lockFile=$dataDirectory/$1_lock_file.pid
    if [ ! -e $lockFile ]; then
        echo $BASHPID > $lockFile
        touch $dataDirectory/$1_query.values
        # keep the previous values to use in producing the difference
        cp -f $dataDirectory/$1_query.values $dataDirectory/$1_query.previous
        run_queries $1 | sort > $dataDirectory/$1_query.values
        output_totals $1 > $dataDirectory/$1_totals.values.tmp
        output_difference $1 > $dataDirectory/$1_difference.values.tmp
        mv $dataDirectory/$1_totals.values.tmp $dataDirectory/$1_totals.values
        mv $dataDirectory/$1_difference.values.tmp $dataDirectory/$1_difference.values
        # cat $dataDirectory/graphs.values
        # cat $dataDirectory/subgraphs.values

        # delay for 30 minutes while the lock file is in place to reduce the queries per hour
        sleep 30m

        rm $lockFile
    fi
}

output_values() {
    cat $dataDirectory/$1_totals.values
    cat $dataDirectory/$1_difference.values
    cat $dataDirectory/$1_totals.values | sed "s|total|counter|g"
    ($0 update &> $dataDirectory/$1_update.log)&
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
            test)
# sudo munin-run frinex_database_stats_production test
# real	1m50.964s
# user	0m15.423s
# sys	0m20.800s

# sudo munin-run frinex_database_stats_frinexbq4 test
# real	0m7.501s
# user	0m2.387s
# sys	0m2.048s
                time run_queries ${linkName#"frinex_database_stats_"}
                ;;
            test2)
# Note that this time might be due to supsequent queries not completing for a given database when one table is not present which would produce incompete results
# sudo munin-run frinex_database_stats_production test2
# real	0m43.864s
# user	0m1.851s
# sys	0m2.317s

# Note that this server does not have any missing tables due to all experimenta being relatively recent
# sudo munin-run frinex_database_stats_frinexbq4 test2
# real	0m1.249s
# user	0m0.257s
# sys	0m0.278s
                time run_queries_union ${linkName#"frinex_database_stats_"}
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
