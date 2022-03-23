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
# @since 23 March 2022 15:09 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/config

# check that the properties to be used match the current machine
if ! grep -q $(hostname) publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
for currentService in $(sudo docker service ls | grep -E "_staging" | grep -E "_admin")
do
    echo $currentService
    # update the web and admin services with the provided parameters
    sudo docker service update $currentService --limit-cpu=".5" --limit-memory=256m
fi;
