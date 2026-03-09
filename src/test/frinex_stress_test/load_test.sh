#!/bin/bash
date
currentUrl="$1"
echo "currentUrl: $currentUrl"
# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
for i in $(seq 1 100); do
    # one participant per second for 10 minutes 60x10, which if completed in that 10 minutes should be a similar rate to 86400 participants in 24 hours
    echo $i
    /frinex_load_test/load_participant.sh "$currentUrl" > "load_participant_${i}.log" 2>&1 &
    # sleep 1
    # pidof load_participant.sh | wc -w
    # pidof curl | wc -w
done
wait
cat load_participant_*.log
