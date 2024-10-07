#!/bin/bash

# Copyright (C) 2022 Max Planck Institute for Psycholinguistics
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
# @since 07 Feb 2022 16:54 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

echo "TODO: please update frinexbuild.mpi.nl to the relevant URI, then comment this line to proceed"; exit;

# Deploying Frinex experiments to the Docker swarm requires this registry to be running
# docker run --rm -it -v registry_certs:/certs nginx openssl req -newkey rsa:4096 -nodes -sha256 -keyout /certs/frinexbuild.mpi.nl.key -addext "subjectAltName = DNS:frinexbuild.mpi.nl" -x509 -days 3650 -out /certs/frinexbuild.mpi.nl.crt
# the self signed certificate needs to be added to the trust directory of each docker node
# sudo mkdir /etc/docker/certs.d/frinexbuild.mpi.nl/
# sudo cp /var/lib/docker/volumes/registry_certs/_data/frinexbuild.mpi.nl.crt /etc/docker/certs.d/frinexbuild.mpi.nl/ca.crt

# TODO: when the certificate is made the resulting file /etc/docker/certs.d/frinexbuild.mpi.nl/ca.crt must be copied to each swarm node so that they trust the registry

# sudo docker secret create frinexbuild.mpi.nl.crt /var/lib/docker/volumes/registry_certs/_data/frinexbuild.mpi.nl.crt
# sudo docker secret create frinexbuild.mpi.nl.key /var/lib/docker/volumes/registry_certs/_data/frinexbuild.mpi.nl.key
# docker stop registry
docker service rm registry
# delete the volume to prevent build up of unused files
# docker volume rm frinexDockerRegistry
docker service create -d \
   --name registry \
   --replicas=1 \
   --secret frinexbuild.mpi.nl.crt \
   --secret frinexbuild.mpi.nl.key \
   -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
   -e REGISTRY_HTTP_TLS_CERTIFICATE=/run/secrets/frinexbuild.mpi.nl.crt \
   -e REGISTRY_HTTP_TLS_KEY=/run/secrets/frinexbuild.mpi.nl.key \
   -p 443:443 \
   registry:2

   # --restart=always \
   # -v registry_certs:/certs \
   # -v /srv/frinex_docker_registry:/var/lib/registry \
   # omitting the frinexDockerRegistry volume for the service because expecting it to exist also requires it to be synchronised across all nodes
   # -v frinexDockerRegistry:/var/lib/registry \

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
   # build the frinex_synchronisation_service
   docker build --rm -f docker/frinex_synchronisation_service.Dockerfile -t DOCKER_REGISTRY/frinex_synchronisation_service:latest .
   docker push DOCKER_REGISTRY/frinex_synchronisation_service:latest

   read -p "Press enter to restart frinex_synchronisation_service"
   # remove the old frinex_synchronisation_service
   docker service rm frinex_synchronisation_service 
   # start the frinex_synchronisation_service
   docker service create -e 'ServiceHostname={{.Node.Hostname}}' --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -dit --name frinex_synchronisation_service DOCKER_REGISTRY/frinex_synchronisation_service:latest

   # for currentService in $(sudo docker service ls | grep -E "_staging|_production" | grep -E "_admin|_web" | awk '{print $2}')
   # do
   #    echo $currentService
   #    # push each web and admin service image currently in use to the empty registry so that they can be accessed by the swarm nodes
   #    # sudo docker push $currentService
   #    # curl "http://frinexbuild:8010/cgi/frinex_restart_experient.cgi?$currentService"
   # done
fi
