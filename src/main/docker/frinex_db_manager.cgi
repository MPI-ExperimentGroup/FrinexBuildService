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
echo ''

PGPASSFILE=/FrinexBuildService/frinex_db_user_authentication
export PGPASSFILE

# appNameInternal must be a "lowercaseValue" enforced by the the XSD, defined as "[a-z]([a-z_0-9]){3,}"

# echo "These should pass:"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example_longer_db
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_exampl0_12345_l0nger_db
# echo "These should fail:"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_example
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?example_db
# curl "frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_exam$ple_db"
# curl "frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_e@xample_db"
# curl frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_eXample_db

#if [[ "frinex_example_db" =~ ^frinex_[a-z0-9_]*_db$ ]]; then echo "ok"; fi;

if [[ "$QUERY_STRING" =~ ^frinex_[a-z0-9_]*_db$ ]]; then
  echo "OK: $QUERY_STRING"
else
  echo "Not a valid Frinex database: $QUERY_STRING"
fi
