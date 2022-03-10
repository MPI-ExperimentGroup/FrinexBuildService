#!/bin/bash

bash frinex_service_hammer.sh > artifacts/frinex_service_hammer_$(date +%F_%T).html

echo "{" > artifacts/service_status.json
echo "\"ok\":{" >> artifacts/service_status.json
grep -c 200 artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","ok",/g' >> artifacts/service_status.json
echo "}, {" >> artifacts/service_status.json
echo "\"total\":{" >> artifacts/service_status.json
grep -c "</td><td>" artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","total",/g' >> artifacts/service_status.json
echo "}" >> artifacts/service_status.json
