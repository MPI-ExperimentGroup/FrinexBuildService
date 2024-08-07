#!/bin/bash
#
# Copyright (C) 2023 Max Planck Institute for Psycholinguistics
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
# @since 04 Jan 2023 14:15 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script runs frinex load test services to test the load handling capacity of the given server

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

docker build --no-cache -f frinex_load_test.Dockerfile -t DockerRegistry/frinex_load_test:latest .
docker push DockerRegistry/frinex_load_test:latest

docker service create --name frinex_load_test --replicas 150 DockerRegistry/frinex_load_test:latest bash "/frinex_load_test/load_test.sh"

docker service logs -f frinex_load_test

read -p "Press enter to terminate the frinex_load_test service"
docker service rm frinex_load_test
