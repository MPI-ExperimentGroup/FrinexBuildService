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

echo "TODO: please update example.com to the relevant URI, then comment this line to proceed"; exit;

# Deploying Frinex experiments to the Docker swarm requires this registry to be running
# docker run --rm -it -v registry_certs:/certs nginx openssl req -newkey rsa:4096 -nodes -sha256 -keyout /certs/example.com.key -addext "subjectAltName = DNS:example.com" -x509 -days 3650 -out /certs/example.com.crt
# the self signed certificate needs to be added to the trust directory of each docker node
# sudo mkdir /etc/docker/certs.d/example.com/
# sudo cp /var/lib/docker/volumes/registry_certs/_data/example.com.crt /etc/docker/certs.d/example.com/ca.crt

# TODO: when the certificate is made the resulting file /etc/docker/certs.d/example.com/ca.crt must be copied to each swarm node so that they trust the registry

docker stop registry
docker container rm registry
docker run -d \
   --restart=always \
   --name registry \
   -v registry_certs:/certs \
   #-v /srv/frinex_docker_registry:/var/lib/registry \
   -v frinexDockerRegistry:/var/lib/registry \
   -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
   -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/example.com.crt \
   -e REGISTRY_HTTP_TLS_KEY=/certs/example.com.key \
   -p 443:443 \
   registry:2
