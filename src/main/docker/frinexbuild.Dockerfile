# Copyright (C) 2020 Max Planck Institute for Psycholinguistics
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
# @since 20 October 2020 08:48 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM httpd:2.4-alpine
RUN apk add --no-cache \
  git \
  git-gitweb \
  git-daemon \
  npm \
  docker \
  curl \
  bash \
  rsync \
  sudo
RUN git config --global user.name "Frinex Build Service"
RUN git config --global user.email "noone@frinexbuild.mpi.nl"
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/git-repositories
RUN mkdir /FrinexBuildService/git-checkedout
RUN mkdir /FrinexBuildService/processing
RUN mkdir /FrinexBuildService/incoming
RUN mkdir /FrinexBuildService/listing
RUN mkdir /usr/local/apache2/htdocs/target
COPY frinex-git-server.conf  /FrinexBuildService/
RUN sed "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/frinex-git-server.conf >> /usr/local/apache2/conf/httpd.conf
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
COPY ./deploy-by-hook.js /FrinexBuildService/
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/deploy-by-hook.js
COPY ./publish.properties /FrinexBuildService/
RUN sed -i "s|TargetDirectory|/usr/local/apache2/htdocs|g" /FrinexBuildService/publish.properties
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/publish.properties
COPY ./post-receive /FrinexBuildService/post-receive
RUN sed -i "s|TargetDirectory|/usr/local/apache2/htdocs|g" /FrinexBuildService/post-receive
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/post-receive
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/post-receive
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/post-receive
COPY ./create_frinex_build_repository.sh /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|TargetDirectory|/usr/local/apache2/htdocs|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN cd /FrinexBuildService/; npm install properties-reader
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh NBL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh POL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh LADD
#COPY ./test_repository_create.sh /FrinexBuildService/
COPY ./settings.xml /FrinexBuildService/
RUN adduser -S frinex -G docker
RUN echo '%daemon ALL=(ALL) NOPASSWD:node --use_strict /FrinexBuildService/deploy-by-hook.js' >> /etc/sudoers
# make sure that the required files are accessable by httpd
RUN chown -R daemon /FrinexBuildService
RUN chown -R daemon /usr/local/apache2/htdocs
RUN mkdir /BackupFiles
RUN chown -R frinex /BackupFiles
# todo: this is required because the experiment commits check and starts the node build script, it would be nice to have more user isolation here
WORKDIR /FrinexBuildService
VOLUME ["buildServerTarget:/usr/local/apache2/htdocs"]
