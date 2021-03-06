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
RUN mkdir /FrinexBuildService/incoming/commits/
RUN mkdir /FrinexBuildService/incoming/static/
RUN mkdir /FrinexBuildService/artifacts
RUN mkdir /FrinexBuildService/docs
RUN mkdir /FrinexBuildService/cgi
COPY docker/frinex-git-server.conf  /FrinexBuildService/
RUN sed -i "s|UrlLDAP|example.com|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|DcLDAP|DC=example,DC=com|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|UserLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|PassLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|#LDAPOPTION||g" /FrinexBuildService/frinex-git-server.conf 
#RUN sed -i "s|#PUBLICOPTION||g" /FrinexBuildService/frinex-git-server.conf 
COPY docker/git_setup.html  /FrinexBuildService/docs/
COPY uml/overview.html  /FrinexBuildService/docs/
COPY uml/ServiceOverview.svg  /FrinexBuildService/docs/
COPY uml/DockerSwarmOverview.svg  /FrinexBuildService/docs/    
COPY docker/repository_setup.cgi  /FrinexBuildService/cgi/
RUN sed "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/frinex-git-server.conf >> /usr/local/apache2/conf/httpd.conf
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
# make sure the LDAP modules are loaded
RUN sed -i "s|^#LoadModule authnz_ldap_module modules/mod_authnz_ldap.so|LoadModule authnz_ldap_module modules/mod_authnz_ldap.so|g" /usr/local/apache2/conf/httpd.conf
RUN sed -i "s|^#LoadModule ldap_module modules/mod_ldap.so|LoadModule ldap_module modules/mod_ldap.so|g" /usr/local/apache2/conf/httpd.conf
RUN sed -i "s|/usr/local/apache2/htdocs|/FrinexBuildService/artifacts|g" /usr/local/apache2/conf/httpd.conf
COPY docker/deploy-by-hook.js /FrinexBuildService/
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/deploy-by-hook.js
COPY config/publish.properties /FrinexBuildService/
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/publish.properties
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/publish.properties
COPY docker/post-receive /FrinexBuildService/post-receive
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/post-receive
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/post-receive
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|BuildServerUrl|http://example.com|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/post-receive
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/post-receive
COPY docker/create_frinex_build_repository.sh /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/create_frinex_build_repository.sh
COPY docker/update_post-receive_hooks.sh /FrinexBuildService/update_post-receive_hooks.sh
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/update_post-receive_hooks.sh
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/update_post-receive_hooks.sh
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/update_post-receive_hooks.sh
RUN cd /FrinexBuildService/; npm install properties-reader; npm install check-disk-space; npm install got;
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh NBL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh POL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh LADD
#COPY ./test_repository_create.sh /FrinexBuildService/
COPY docker/settings.xml /FrinexBuildService/
# the docker group in the container us unlikely to match the host docker group id
#RUN adduser -S frinex -G docker
RUN adduser -S frinex
RUN echo '%daemon ALL=(ALL) NOPASSWD: /usr/bin/node --use_strict /FrinexBuildService/deploy-by-hook.js' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker' >> /etc/sudoers
# make sure that the required files are accessable by httpd
RUN chown -R frinex:daemon /FrinexBuildService
RUN chmod -R ug+rwx /FrinexBuildService
RUN chown -R frinex:daemon /FrinexBuildService/artifacts
RUN chmod -R ug+rwx /FrinexBuildService/artifacts
RUN chown -R frinex:daemon /FrinexBuildService/docs
RUN chmod -R ug+rwx /FrinexBuildService/docs
RUN chown -R frinex:daemon /FrinexBuildService/cgi
RUN chmod -R ug+rwx /FrinexBuildService/cgi
#RUN mkdir /BackupFiles
#RUN chown -R frinex:daemon /BackupFiles
#RUN chmod -R ug+rwx /BackupFiles
# todo: this is required because the experiment commits check and starts the node build script, it would be nice to have more user isolation here
WORKDIR /FrinexBuildService
VOLUME ["buildServerTarget:/FrinexBuildService/artifacts"]
