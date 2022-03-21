#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
for i in {1..100}; do
    /FrinexBuildService/check_service_status.sh&
    sleep 1
done
