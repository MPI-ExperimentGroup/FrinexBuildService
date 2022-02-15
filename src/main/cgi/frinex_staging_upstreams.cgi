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
# @since 7 October 2021 8:27 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates JSON file of experiment services running in the Docker swarm

echo "Content-type: text/json"
echo ''
docker service ls \
    | grep -E "_staging" \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' \
    | sed 's/->8080\/tcp//g' \
    | awk '{print "upstream " $1 " {\n server lux22.mpi.nl:" $6 ";\n server lux23.mpi.nl:" $6 ";\n server lux25.mpi.nl:" $6 ";\n}\n"}'
