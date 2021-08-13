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
# @since 13 August 2021 7:56 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/config

# check that the properties to be used match the current machine
if ! grep -q $(hostname) publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # terminate experiment admin applications running in the docker swarm 
    docker service rm $(docker service ls | grep -i "_admin" | awk 'NR>1 {print $2}')
    # terminate experiment web applications running in the docker swarm 
    docker service rm $(docker service ls | grep -i "_web" | awk 'NR>1 {print $2}')
fi;
