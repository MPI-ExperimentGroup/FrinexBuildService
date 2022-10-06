#!/bin/bash
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


# @since 2 March, 2021 16:40 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

PGPASSFILE=/FrinexBuildService/frinex_db_user_authentication
export PGPASSFILE

postgresCommand="psql -h DatabaseStagingUrl -p DatabaseStagingPort"
# postgresCommand="/Applications/Postgres.app/Contents/Versions/9.4/bin/psql -p5432"

echo "{";
isFirstEntry=true;
# $postgresCommand postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres' and datname like 'frinex_%_db'" | while read -a currentexperiment ; do
for currentexperiment in $($postgresCommand -U db_manager_frinex_staging -d postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres' and datname like 'frinex_%_db'");
do 
    if [ "$isFirstEntry" = false ] ; then
      echo "},";
    fi
    experimentName=${currentexperiment%"_db"};
    experimentName=${experimentName#"frinex_"};
    isFirstEntry=false;
    echo '"'$experimentName'": {'
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"firstDeploymentAccessed\":\"' || min(submit_date) || '\",' from screen_data";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"totalDeploymentsAccessed\":\"' || count(distinct tag_value) || '\",' from tag_data where event_tag = 'compileDate'";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"totalParticipantsSeen\":\"' || count(distinct user_id) || '\",' from participant";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"firstParticipantSeen\":\"' || min(submit_date) || '\",' from participant";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"lastParticipantSeen\":\"' || max(submit_date) || '\",' from participant";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"totalPageLoads\":\"' || count(distinct tag_date) || '\",' from tag_data where event_tag = 'compileDate'";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"totalStimulusResponses\":\"' || count(distinct concat(tag_date, user_id, event_ms)) || '\",' from stimulus_response";
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"totalMediaResponses\":\"' || count(id) || '\",' from audio_data";
    echo '"participantsFirstAndLastSeen": [';
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '[\"' || min(submit_date) || '\",\"' || max(submit_date) || '\"],' from participant where submit_date is not null group by user_id order by min(submit_date) asc" | sed "$ s|\],[[:space:]]*$|]|g";
    echo "],";
    echo '"sessionFirstAndLastSeen": [';
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '[\"' || min(submit_date) || '\",\"' || max(submit_date) || '\"],' from tag_data where submit_date is not null group by user_id order by min(submit_date) asc" | sed "$ s|\],[[:space:]]*$|]|g";
    echo "],";
    echo '"frinexVersion": {';
    PGPASSWORD='DatabaseStagingPass' $postgresCommand -U ${currentexperiment%_db}"_user" -d $currentexperiment --no-align -t -c "select '\"' || tag_value || '\": { \"first_use\": \"' || min(tag_date) || '\", \"last_use\": \"' || max(tag_date) || '\", \"page_loads\": ' || count(tag_value) || ', \"distinct_users\": ' || count(distinct(user_id)) || '},'  from tag_data where event_tag = 'projectVersion' group by tag_value order by min(tag_value) asc" | sed "$ s|\},[[:space:]]*$|}|g";
    echo "}";
done
echo "}";
echo "}";
