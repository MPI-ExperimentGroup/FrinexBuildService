#!/bin/bash
date
# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
for i in {1..600}; do
    # one participant per second for 10 minutes 60x10, which if completed in that 10 minutes should be a similar rate to 86400 participants in 24 hours
    echo $i
    time ./load_participant.sh&
    sleep 1
    pidof load_participant.sh | wc -w
    pidof curl | wc -w
done
