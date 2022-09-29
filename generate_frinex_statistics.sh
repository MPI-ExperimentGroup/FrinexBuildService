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
#

#
# @since 29 September 2022 17:20 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")/src/main/
workingDir=$(pwd -P)

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # generate the JSON file containing experiment stats directly from postgres for use in the build server pages
    docker run -v buildServerTarget:/FrinexBuildService/artifacts -it --rm --name bootstrap_public_stats frinex_db_manager:latest bash -c "/FrinexBuildService/stats/bootstrap_public_statistics.sh > /FrinexBuildService/artifacts/staging_public_stats.json"

    # generate the XML element usage stats file
    docker run -v buildServerTarget:/FrinexBuildService/artifacts -v gitCheckedout:/FrinexBuildService/git-checkedout --rm -it --name frinex_usage_stats frinexbuild:latest bash -c "grep -c '<preventWindowClose' git-checkedout/*/*.xml | grep -v ':0$' > /FrinexBuildService/artifacts/frinex_usage_stats.json"
fi;
