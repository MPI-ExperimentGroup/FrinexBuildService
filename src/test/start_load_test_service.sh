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

# docker build --no-cache -f frinex_load_test.Dockerfile -t DockerRegistry/frinex_load_test:latest .
# docker push DockerRegistry/frinex_load_test:latest

# docker service create --restart-condition none --name frinex_load_test --replicas 50 DockerRegistry/frinex_load_test:latest "/frinex_load_test/load_test.sh"

# docker service logs -f frinex_load_test

# read -p "Press enter to terminate the frinex_load_test service"
# docker service rm frinex_load_test

docker build --no-cache -f frinex_load_test.Dockerfile -t frinex_load_test:latest .
for i in $(seq 1 100); do
    docker stop load_test_$i
    docker rm load_test_$i
done
for i in $(seq 1 100); do
    docker run -d --rm --name load_test_$i frinex_load_test:latest sh /frinex_load_test/load_test.sh
    docker logs -f load_test_$i > "$scriptDir/load_test_${i}_$(date +%Y%m%d%H%M).log" &
done

# watch -n 2 'docker ps -a --filter "name=load_test_"'

# docker logs -f $(docker ps --filter "name=load_test_" -q) | tee "load_test_output_$(date +"%Y%m%d%H%M").log"

tail -f "$scriptDir/load_test_*_$(date +%Y%m%d)*.log"