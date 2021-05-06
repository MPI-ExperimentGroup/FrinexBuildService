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
# @since 3 May 2021 14:56 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/docker

# check that the properties to be used match the current machine
if ! grep -q $(hostname) publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # clean up volumes
    docker volume rm $(docker volume ls | grep -v "gitRepositories" | grep -v "m2Directory" | grep -v "buildServerTarget" | awk 'NR>1 {print $2}')
    # clean up images
    docker image rm $(docker image ls | grep -v "frinexbuild" | grep -v "frinexapps" | awk 'NR>1 {print $3}')
fi;
