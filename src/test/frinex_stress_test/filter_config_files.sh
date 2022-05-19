#!/bin/bash

# this script applies location specific settings in the various configuration files during the docker image build process.

sed -i "s|swarmNode1Url|http://node1.example.com|g" /FrinexBuildService/frinex_service_hammer.sh
sed -i "s|swarmNode2Url|http://node2.example.com|g" /FrinexBuildService/frinex_service_hammer.sh
sed -i "s|swarmNode3Url|http://node3.example.com|g" /FrinexBuildService/frinex_service_hammer.sh
sed -i "s|nginxProxiedUrl|https://staging.example.com|g" /FrinexBuildService/frinex_service_hammer.sh
