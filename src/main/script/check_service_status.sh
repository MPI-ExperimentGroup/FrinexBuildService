#!/bin/bash

bash frinex_service_hammer.sh > artifacts/frinex_service_hammer_$(date +%F_%T).html

echo "{" > artifacts/service_status.js
echo "\"ok\":{" >> artifacts/service_status.js
grep -c 200 artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","ok",/g' >> artifacts/service_status.js
echo "}, {" >> artifacts/service_status.js
echo "\"total\":{" >> artifacts/service_status.js
grep -c "<tr" artifacts/frinex_service_hammer_* | sed 's|artifacts/frinex_service_hammer_|"|g' | sed 's/.html:/","total",/g' >> artifacts/service_status.js
echo "}" >> artifacts/service_status.js
