# Copyright (C) 2021 Max Planck Institute for Psycholinguistics
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
# @since 15 Feb 2022 12:58 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM httpd:alpine3.20
RUN apk add --no-cache \
  curl \
  coreutils \
  bash \
  rsync \
  docker \
  diffutils \
  openssh \
  sudo
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/cgi
COPY cgi/frinex_locations_update.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_staging_upstreams.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_staging_locations.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_production_upstreams.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_production_locations.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_tomcat_staging_locations.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_restart_experient.cgi /FrinexBuildService/cgi/
COPY cgi/request_scaling.cgi /FrinexBuildService/cgi/
COPY config/frinex_db_manager.conf  /FrinexBuildService/
COPY config/publish.properties /FrinexBuildService/
COPY script/sleep_and_resurrect_docker_experiments.sh /FrinexBuildService/
COPY script/sync_file_to_swarm_nodes.sh /FrinexBuildService/script/
RUN serviceOptions=$(grep serviceOptions /FrinexBuildService/publish.properties | sed "s/serviceOptions[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r"); sed -i "s/DOCKER_SERVICE_OPTIONS/$serviceOptions/g" /FrinexBuildService/cgi/frinex_restart_experient.cgi
RUN dockerRegistry=$(grep dockerRegistry /FrinexBuildService/publish.properties | sed "s/dockerRegistry[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r"); sed -i "s/DOCKER_REGISTRY/$dockerRegistry/g" /FrinexBuildService/cgi/frinex_restart_experient.cgi
RUN proxyUpdateTrigger=$(grep proxyUpdateTrigger /FrinexBuildService/publish.properties | sed "s/proxyUpdateTrigger[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r"); sed -i "s|PROXY_UPDATE_TRIGGER|$proxyUpdateTrigger|g" /FrinexBuildService/cgi/frinex_restart_experient.cgi
RUN proxyUpdateTrigger=$(grep proxyUpdateTrigger /FrinexBuildService/publish.properties | sed "s/proxyUpdateTrigger[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r"); sed -i "s|PROXY_UPDATE_TRIGGER|$proxyUpdateTrigger|g" /FrinexBuildService/sleep_and_resurrect_docker_experiments.sh
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/cgi/request_scaling.cgi
RUN rm /FrinexBuildService/publish.properties
RUN cat /FrinexBuildService/cgi/frinex_restart_experient.cgi
RUN cat /FrinexBuildService/cgi/request_scaling.cgi
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
RUN cat /FrinexBuildService/frinex_db_manager.conf >> /usr/local/apache2/conf/httpd.conf
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker build --no-cache --force-rm -f /FrinexBuildService/protected/[a-z0-9-_]*/[a-z0-9-_]*_staging_web.Docker -t [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]* /FrinexBuildService/protected/[a-z0-9-_]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker build --no-cache --force-rm -f /FrinexBuildService/protected/[a-z0-9-_]*/[a-z0-9-_]*_staging_admin.Docker -t [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]* /FrinexBuildService/protected/[a-z0-9-_]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker build --no-cache --force-rm -f /FrinexBuildService/protected/[a-z0-9-_]*/[a-z0-9-_]*_production_web.Docker -t [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]* /FrinexBuildService/protected/[a-z0-9-_]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker build --no-cache --force-rm -f /FrinexBuildService/protected/[a-z0-9-_]*/[a-z0-9-_]*_production_admin.Docker -t [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]* /FrinexBuildService/protected/[a-z0-9-_]*' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]*' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service rm [a-z0-9-_]*_staging_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service rm [a-z0-9-_]*_staging_admin' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service rm [a-z0-9-_]*_production_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service rm [a-z0-9-_]*_production_admin' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service create --name [a-z0-9-_]*_staging_web  --replicas=[0-9]* --limit-cpu=[0-9.]* --limit-memory=[0-9]*m -d -p 8080 [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service create --name [a-z0-9-_]*_staging_admin  --replicas=[0-9]* --limit-cpu=[0-9.]* --limit-memory=[0-9]*m -d -p 8080 [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service create --name [a-z0-9-_]*_production_web  --replicas=[0-9]* --limit-cpu=[0-9.]* --limit-memory=[0-9]*m -d -p 8080 [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service create --name [a-z0-9-_]*_production_admin  --replicas=[0-9]* --limit-cpu=[0-9.]* --limit-memory=[0-9]*m -d -p 8080 [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]*' >> /etc/sudoers
#RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service create --name [a-z0-9-_]+(_staging_web|_staging_admin|_production_web|_production_admin)( --[a-z-]+\=[a-z0-9.]+)* -d -p 8080 [a-zA-Z0-9-_.]+/[a-z0-9-_]+(_staging_web|_staging_admin|_production_web|_production_admin)\:[0-9]*' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker system prune -f' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls --format {{.Name}}' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls --format {{.Ports}}{{.Name}}' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls --format {{.Ports}}{{.Name}} -f name=frinex_synchronisation_service' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service inspect --format {{[a-zA-Z.]*}} [a-z0-9-_]*_staging_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service inspect --format {{[a-zA-Z.]*}} [a-z0-9-_]*_staging_admin' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service inspect --format {{[a-zA-Z.]*}} [a-z0-9-_]*_production_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service inspect --format {{[a-zA-Z.]*}} [a-z0-9-_]*_production_admin' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service update [a-z0-9-_]*_staging_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service update [a-z0-9-_]*_staging_admin' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service update [a-z0-9-_]*_production_web' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service update [a-z0-9-_]*_production_admin' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service scale [a-z0-9-_]=[0-9]*' >> /etc/sudoers

RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /bin/chown -R frinex\:www-data /FrinexBuildService/artifacts/[a-z0-9-_]*/' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /bin/chmod -R ug+rwx /FrinexBuildService/artifacts/[a-z0-9-_]*/' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker node ps [a-zA-Z0-9-_.]*' >> /etc/sudoers
RUN echo 'www-data, frinex ALL=(ALL) NOPASSWD: /usr/bin/docker node ls --format {{.Hostname}}' >> /etc/sudoers

RUN chown -R www-data:daemon /FrinexBuildService
RUN chown -R www-data:daemon /usr/local/apache2/htdocs/
RUN chmod -R ug+rwx /FrinexBuildService
RUN adduser -S frinex -u 101010
RUN addgroup -g 101010 frinex
RUN addgroup frinex frinex
COPY .ssh/id_rsa /home/frinex/.ssh/id_rsa
COPY .ssh/id_rsa.pub /home/frinex/.ssh/id_rsa.pub
COPY .ssh/known_hosts /home/frinex/.ssh/known_hosts
RUN chown -R frinex:nogroup /home/frinex/.ssh
RUN chmod 600 /home/frinex/.ssh/*
RUN chmod 700 /home/frinex/.ssh
RUN chmod 644 /home/frinex/.ssh/*.pub
WORKDIR /FrinexBuildService
RUN chown www-data:www-data /usr/local/apache2/logs
RUN chown frinex /FrinexBuildService/sleep_and_resurrect_docker_experiments.sh
RUN chown frinex /FrinexBuildService/script/sync_file_to_swarm_nodes.sh
#USER frinex
USER www-data
