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


# @since 31 May, 2022 12:49 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

PGPASSFILE=/FrinexBuildService/frinex_db_user_authentication
export PGPASSFILE

echo "{";
# /frinex_munin_stats
psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_staging_user -d postgres --no-align -t -c "select datname from pg_database where datistemplate = false and datname != 'postgres'" | while read -a currentexperiment ; do
    currentExperimentUser=frinex_${currentexperiment%_db}_user
    echo '"'$currentExperimentUser'": {'
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '\"firstDeploymentAccessed\":\"' || min(submit_date) || '\",' from screen_data";
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '\"totalDeploymentsAccessed\":\"' || count(distinct tag_value) || '\",' from tag_data where event_tag = 'compileDate'";
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '\"totalParticipantsSeen\":\"' || count(distinct user_id) || '\",' from participant";
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '\"firstParticipantSeen\":\"' || min(submit_date) || '\",' from participant";
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '\"lastParticipantSeen\":\"' || max(submit_date) || '\",' from participant";
    echo '"participantsFirstAndLastSeen": [';
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '[\"' || min(submit_date) || '\",\"' || max(submit_date) || '\"],' from participant group by user_id order by min(submit_date) asc";
    echo "],";
    echo '"sessionFirstAndLastSeen": [';
    PGPASSWORD=examplechangethis psql -h DatabaseStagingUrl -p DatabaseStagingPort -U frinex_${currentExperimentUser}_user -d $currentexperiment --no-align -t -c "select '[\"' || min(submit_date) || '\",\"' || max(submit_date) || '\"],' from tag_data group by user_id order by min(submit_date) asc";
    echo "]},";
done
echo "}";