#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
bash frinex_service_hammer.sh > /FrinexBuildService/artifacts/frinex_service_hammer_$(date +%F_%T).html

echo "{" > /FrinexBuildService/artifacts/service_status.json
echo "\"ok\":{" >> /FrinexBuildService/artifacts/service_status.json
grep -c 200 artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","ok",/g' >> /FrinexBuildService/artifacts/service_status.json
echo "}, {" >> /FrinexBuildService/artifacts/service_status.json
echo "\"total\":{" >> /FrinexBuildService/artifacts/service_status.json
grep -c "</td><td>" artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","total",/g' >> /FrinexBuildService/artifacts/service_status.json
echo "}" >> /FrinexBuildService/artifacts/service_status.json
