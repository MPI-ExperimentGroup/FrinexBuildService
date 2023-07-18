#!/bin/bash
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


# @since 6 December 2022 16:32 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

PGPASSFILE=/FrinexBuildService/frinex_db_user_authentication
export PGPASSFILE

postgresCommand="psql -h DatabaseStagingUrl -p DatabaseStagingPort"
# postgresCommand="/Applications/Postgres.app/Contents/Versions/14/bin/psql -p5432"

for currentexperiment in $($postgresCommand -U db_manager_frinex_staging -d postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres' and datname like 'frinex_%_db'");
do 
    experimentName=${currentexperiment%"_db"};
    experimentName=${experimentName#"frinex_"};
    echo -n $experimentName'.totalDeploymentsAccessed.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_value) from tag_data where event_tag = 'compileDate'";
    echo -n $experimentName'.totalParticipantsSeen.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct user_id) from participant";
    echo -n $experimentName'.totalPageLoads.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct tag_date) from tag_data where event_tag = 'compileDate'";
    echo -n $experimentName'.totalStimulusResponses.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct concat(tag_date, user_id, event_ms)) from stimulus_response";
    echo -n $experimentName'.totalMediaResponses.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from audio_data";
    echo -n $experimentName'.tag_data.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_data";
    echo -n $experimentName'.tag_pair_data.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from tag_pair_data";
    echo -n $experimentName'.group_data.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from group_data";
    echo -n $experimentName'.screen_data.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from screen_data";
    echo -n $experimentName'.stimulus_response.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from stimulus_response";
    echo -n $experimentName'.stimulus_response_distinct.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(distinct concat(tag_date, user_id, event_ms)) from stimulus_response";
    echo -n $experimentName'.time_stamp.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from time_stamp";
    echo -n $experimentName'.totalDeletionEvents.value '
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select count(id) from data_deletion_log";
done
