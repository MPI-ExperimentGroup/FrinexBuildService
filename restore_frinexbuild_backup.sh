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
#

#
# @since 23 Feb 2021 14:10 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)

# check that the properties to be used match the current machine
if ! grep -q $(hostname) src/main/docker/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # start the frinexbuild container and rsync the last backup into the required docker volumes
    docker run -v gitCheckedout:/FrinexBuildService/git-checkedout -v gitRepositories:/FrinexBuildService/git-repositories -v buildServerTarget:/usr/local/apache2/htdocs -v $workingDir/BackupFiles:/BackupFiles -it --name frinexbuild-restore frinexbuild:latest /bin/bash -c "rsync -a /BackupFiles/buildartifacts/ /usr/local/apache2/htdocs/; rsync -a /BackupFiles/git-* /FrinexBuildService/;";
fi;