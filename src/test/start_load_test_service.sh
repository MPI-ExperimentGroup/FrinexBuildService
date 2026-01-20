#!/usr/bin/env bash
set -Eeuo pipefail
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
    docker stop load_test_$i || true
done
for i in $(seq 1 100); do
    docker rm load_test_$i || true
done

startDate=$(date +%Y%m%d%H%M)

docker service ls | grep load_test >> "$scriptDir/load_test_$startDate.log"

for i in $(seq 1 100); do
    docker run -d --rm --name load_test_$i frinex_load_test:latest sh /frinex_load_test/load_test.sh
    docker logs -f load_test_$i > "$scriptDir/load_test_${i}_$startDate.log" &
done

# watch -n 2 'docker ps -a --filter "name=load_test_"'

# docker logs -f $(docker ps --filter "name=load_test_" -q) | tee "load_test_output_$(date +"%Y%m%d%H%M").log"

# tail -f $scriptDir/load_test_*_$startDate.log

for i in $(seq 1 100); do
    echo "docker wait load_test_$i"
    docker wait "load_test_$i"
done

docker service ls | grep load_test >> "$scriptDir/load_test_$startDate.log"

echo "Process ran from $startDate until $(date '+%Y%m%d%H%M')" >> "$scriptDir/load_test_$startDate.log"

echo "generating stats" >> "$scriptDir/load_test_$startDate.log"

echo "mediaBlob:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "mediaBlob:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "mediaBlob:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "mediaBlob:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "mediaBlob:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "mediaBlob:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "mediaBlob:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "mediaBlob:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "metadata:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "metadata:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "metadata:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "metadata:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "metadata:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "metadata:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "metadata:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "metadata:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "screenChange:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "screenChange:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "screenChange:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "screenChange:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "screenChange:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "screenChange:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "screenChange:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "screenChange:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "tagEvent:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagEvent:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagEvent:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagEvent:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagEvent:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagEvent:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagEvent:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagEvent:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "tagPairEvent:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagPairEvent:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagPairEvent:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagPairEvent:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagPairEvent:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagPairEvent:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "tagPairEvent:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "tagPairEvent:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "timeStamp:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "timeStamp:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "timeStamp:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "timeStamp:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "timeStamp:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "timeStamp:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "timeStamp:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "timeStamp:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "stimulusResponse:200s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "stimulusResponse:2" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "stimulusResponse:400s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "stimulusResponse:4" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "stimulusResponse:500s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "stimulusResponse:5" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "stimulusResponse:000s" >> "$scriptDir/load_test_$startDate.log"
grep -oh "stimulusResponse:0" $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

echo "200s" >> "$scriptDir/load_test_$startDate.log"
grep -Eoh ":2[0-9]{2}," $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "400s" >> "$scriptDir/load_test_$startDate.log"
grep -Eoh ":4[0-9]{2}," $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "500s" >> "$scriptDir/load_test_$startDate.log"
grep -Eoh ":5[0-9]{2}," $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"
echo "000s" >> "$scriptDir/load_test_$startDate.log"
grep -Eoh ":0[0-9]{2}," $scriptDir/load_test_*_$startDate.log | wc -l >> "$scriptDir/load_test_$startDate.log"

cat "$scriptDir/load_test_$startDate.log"
