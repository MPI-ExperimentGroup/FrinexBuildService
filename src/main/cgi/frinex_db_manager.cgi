#!/bin/bash
#
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
#

#
# @since 20 May 2021 11:38 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script checks if the requested database exists and if it is not found the database will be created and permissions granted.

echo "Content-type: text/html"

PGPASSFILE=/FrinexBuildService/frinex_db_user_authentication
export PGPASSFILE

# this CGI script can be manually tested with: QUERY_STRING="frinex_manualtest_db" bash cgi/frinex_db_manager.cgi

# appNameInternal must be a "lowercaseValue" enforced by the the XSD, defined as "[a-z]([a-z_0-9]){3,}"

# echo "These should pass:"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example_longer_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_exampl0_12345_l0nger_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_le3_db
# echo "These should fail:"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?example_db
# curl "frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_exam$ple_db"
# curl "frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_e@xample_db"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_eXample_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_le_db

#if [[ "frinex_example_db" =~ ^frinex_[a-z0-9_]*_db$ ]]; then echo "ok"; fi;

if [[ "$QUERY_STRING" =~ ^frinex_[a-z0-9_]*_db$ ]]; then
    appNameInternal=${QUERY_STRING#"frinex_"}
    appNameInternal=${appNameInternal%"_db"}
    if [[ ${#appNameInternal} -gt 2 ]] ; then
        messageString="appNameInternal: $appNameInternal"
        # create the experiment DB on staging
        if [ "$(psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='frinex_${appNameInternal}_db'" )" = '1' ]; then
            messageString="$messageString\nDatabase already exists\n"
            alterRole=$(psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging -d postgres -tAc "ALTER USER frinex_${appNameInternal}_user WITH PASSWORD 'DatabaseStagingPass';")
            messageString="$messageString\n$alterRole"
            if [ "$alterRole" != "ALTER ROLE" ]
            then
                echo "Status: 400 Failed ALTER ROLE: $appNameInternal $messageString"
                echo ''
            fi
        else
            messageString="$messageString\nDatabase being created\n"
            createRole=$(psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging -d postgres -tAc "CREATE USER frinex_${appNameInternal}_user WITH PASSWORD 'DatabaseStagingPass';")
            messageString="$messageString\n$createRole"
            if [ "$createRole" != "CREATE ROLE" ]
            then
                echo "Status: 400 Failed CREATE ROLE: $appNameInternal $messageString"
                echo ''
            fi
            createDatabase=$(psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging -d postgres -tAc "CREATE DATABASE frinex_${appNameInternal}_db;")
            messageString="$messageString\n$createDatabase"
            if [ "$createDatabase" != "CREATE DATABASE" ]
            then
                echo "Status: 400 Failed CREATE DATABASE: $appNameInternal $messageString"
                echo ''
            fi
            grant=$(psql -h DatabaseStagingUrl -p DatabaseStagingPort -U db_manager_frinex_staging -d postgres -tAc "GRANT ALL PRIVILEGES ON DATABASE frinex_${appNameInternal}_db to frinex_${appNameInternal}_user;")
            messageString="$messageString\n$grant"
            if [ "$grant" != "GRANT" ]
            then
                echo "Status: 400 Failed GRANT: $appNameInternal $messageString"
                echo ''
            fi
        fi
        # create the experiment DB on production
        if [ "$(psql -h DatabaseProductionUrl -p DatabaseProductionPort -U db_manager_frinex_production -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='frinex_${appNameInternal}_db'" )" = '1' ]; then
            alterRole=$(psql -h DatabaseProductionUrl -p DatabaseProductionPort -U db_manager_frinex_production -d postgres -tAc "ALTER USER frinex_${appNameInternal}_user WITH PASSWORD 'DatabaseProductionPass';")
            messageString="$messageString\n$alterRole"
            if [ "$alterRole" != "ALTER ROLE" ]
            then
                echo "Status: 400 Failed ALTER ROLE: $appNameInternal $messageString"
                echo ''
            else
                echo "Status: 200 OK Database exists $QUERY_STRING $messageString"
                echo ''
            fi
        else
            # echo "Database being created"
            createRole=$(psql -h DatabaseProductionUrl -p DatabaseProductionPort -U db_manager_frinex_production -d postgres -tAc "CREATE USER frinex_${appNameInternal}_user WITH PASSWORD 'DatabaseProductionPass';")
            messageString="$messageString\n$createRole"
            if [ "$createRole" != "CREATE ROLE" ]
            then
                echo "Status: 400 Failed CREATE ROLE: $appNameInternal $messageString"
                echo ''
            fi
            createDatabase=$(psql -h DatabaseProductionUrl -p DatabaseProductionPort -U db_manager_frinex_production -d postgres -tAc "CREATE DATABASE frinex_${appNameInternal}_db;")
            messageString="$messageString\n$createDatabase"
            if [ "$createDatabase" != "CREATE DATABASE" ]
            then
                echo "Status: 400 Failed CREATE DATABASE: $appNameInternal $messageString"
                echo ''
            fi
            grant=$(psql -h DatabaseProductionUrl -p DatabaseProductionPort -U db_manager_frinex_production -d postgres -tAc "GRANT ALL PRIVILEGES ON DATABASE frinex_${appNameInternal}_db to frinex_${appNameInternal}_user;")
            messageString="$messageString\n$grant"
            if [ "$grant" != "GRANT" ]
            then
                echo "Status: 400 Failed GRANT: $appNameInternal $messageString"
                echo ''
            else
                echo "Status: 200 OK Database created $QUERY_STRING $messageString"
                echo ''
            fi
        fi
    else
        echo "Status: 400 Frinex experiment name too short: $appNameInternal"
        echo ''
    fi
else
  echo "Status: 400 Not a valid Frinex database $QUERY_STRING"
  echo ''
fi
