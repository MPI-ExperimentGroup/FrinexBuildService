#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
for i in {1..100}; do
    /FrinexBuildService/log_service_hammer.sh&
    sleep 1
done
