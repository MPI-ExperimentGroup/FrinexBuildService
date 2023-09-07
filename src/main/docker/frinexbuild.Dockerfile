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
  zip \
  zgrep \
  sudo
RUN git config --global user.name "Frinex Build Service"
RUN git config --global user.email "noone@frinexbuild.mpi.nl"
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/git-repositories
RUN mkdir /FrinexBuildService/git-checkedout
RUN mkdir /FrinexBuildService/wizard-experiments
RUN mkdir /FrinexBuildService/processing
RUN mkdir /FrinexBuildService/incoming
RUN mkdir /FrinexBuildService/listing
RUN mkdir /FrinexBuildService/incoming/commits/
RUN mkdir /FrinexBuildService/incoming/static/
RUN mkdir /FrinexBuildService/artifacts
RUN mkdir /FrinexBuildService/protected
RUN mkdir /FrinexBuildService/docs
RUN mkdir /FrinexBuildService/lib
RUN mkdir /FrinexBuildService/cgi
# make the current version of jquery and chartjs available for the documentation and stats pages
RUN curl -o /FrinexBuildService/lib/jquery.min.js https://code.jquery.com/jquery-3.6.3.min.js
RUN curl -o /FrinexBuildService/lib/Chart.js https://cdnjs.com/libraries/Chart.js
COPY docker/frinex-git-server.conf  /FrinexBuildService/
COPY docker/git_setup.html /FrinexBuildService/docs/
COPY uml/overview.html /FrinexBuildService/docs/
COPY uml/ServiceOverview.svg /FrinexBuildService/docs/
COPY uml/DockerSwarmOverview.svg /FrinexBuildService/docs/
COPY static/stats.html /FrinexBuildService/docs/
COPY static/stats.js /FrinexBuildService/docs/
COPY cgi/repository_setup.cgi /FrinexBuildService/cgi/
COPY cgi/request_build.cgi /FrinexBuildService/cgi/
COPY cgi/experiment_access.cgi /FrinexBuildService/cgi/
# apply location specific settings to the various configuration files
COPY docker/filter_config_files.sh /FrinexBuildService/
RUN chmod +x /FrinexBuildService/filter_config_files.sh
RUN /FrinexBuildService/filter_config_files.sh
RUN sed "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/frinex-git-server.conf >> /usr/local/apache2/conf/httpd.conf
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
# make sure the LDAP modules are loaded
RUN sed -i "s|^#LoadModule authnz_ldap_module modules/mod_authnz_ldap.so|LoadModule authnz_ldap_module modules/mod_authnz_ldap.so|g" /usr/local/apache2/conf/httpd.conf
RUN sed -i "s|^#LoadModule ldap_module modules/mod_ldap.so|LoadModule ldap_module modules/mod_ldap.so|g" /usr/local/apache2/conf/httpd.conf
RUN sed -i "s|/usr/local/apache2/htdocs|/FrinexBuildService/artifacts|g" /usr/local/apache2/conf/httpd.conf
COPY docker/deploy-by-hook.js /FrinexBuildService/
COPY static/buildlisting.html /FrinexBuildService/
# artifacts is a volume so there is no point writing to it here: RUN echo "The build listing will replace this message when the build process starts." > /FrinexBuildService/artifacts/index.html
COPY static/buildlisting.js /FrinexBuildService/
COPY docker/package.json /FrinexBuildService/
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/deploy-by-hook.js
COPY config/publish.properties /FrinexBuildService/
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/publish.properties
RUN sed -i "s|ProtectedDirectory|/FrinexBuildService/protected|g" /FrinexBuildService/publish.properties
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/publish.properties
COPY docker/post-receive /FrinexBuildService/post-receive
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/post-receive
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/post-receive
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|ScriptsDirectory|/FrinexBuildService|g" /FrinexBuildService/cgi/request_build.cgi
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/cgi/repository_setup.cgi
RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/cgi/request_build.cgi
RUN sed -i "s|ProtectedDirectory|/FrinexBuildService/protected|g" /FrinexBuildService/cgi/experiment_access.cgi
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
RUN cd /FrinexBuildService/; npm install properties-reader; npm install check-disk-space; npm install got; npm install omgopass;
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh NBL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh POL
#RUN sh /FrinexBuildService/create_frinex_build_repository.sh LADD
#COPY ./test_repository_create.sh /FrinexBuildService/
# COPY config/settings.xml /FrinexBuildService/
# the docker group in the container is unlikely to match the host docker group id
#RUN adduser -S frinex -G docker
# we do not use the docker group for permissions on the docker.sock instead we use sudo for the frinex user to control containers
RUN adduser -S frinex
# the use of daemon in these permissions failed when using Apache/2.4.52 so daemon has been replaced with www-data in this section
# RUN echo '%daemon ALL=(ALL) NOPASSWD: /usr/bin/node --use_strict /FrinexBuildService/deploy-by-hook.js' >> /etc/sudoers
RUN echo 'www-data ALL=(ALL) NOPASSWD: /usr/bin/node --use_strict /FrinexBuildService/deploy-by-hook.js' >> /etc/sudoers
RUN echo 'www-data ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker' >> /etc/sudoers
# make sure that the required files are accessable by httpd
# RUN chown -R frinex:daemon /FrinexBuildService
RUN chown -R frinex:www-data /FrinexBuildService
RUN chmod -R ug+rwx /FrinexBuildService
# RUN chown -R frinex:daemon /FrinexBuildService/artifacts
RUN chown -R frinex:www-data /FrinexBuildService/artifacts
RUN chmod -R ug+rwx /FrinexBuildService/artifacts
# RUN chown -R frinex:daemon /FrinexBuildService/protected
RUN chown -R frinex:www-data /FrinexBuildService/protected
RUN chmod -R ug+rwx /FrinexBuildService/protected
# RUN chown -R frinex:daemon /FrinexBuildService/docs
RUN chown -R frinex:www-data /FrinexBuildService/docs
RUN chmod -R ug+rwx /FrinexBuildService/docs
# RUN chown -R frinex:daemon /FrinexBuildService/cgi
RUN chown -R www-data:daemon /FrinexBuildService/cgi
RUN chmod -R ug+rwx /FrinexBuildService/cgi
# RUN chown www-data:daemon /FrinexBuildService/cgi/*.cgi
#RUN mkdir /BackupFiles
#RUN chown -R frinex:daemon /BackupFiles
#RUN chmod -R ug+rwx /BackupFiles
# todo: this is required because the experiment commits check and starts the node build script, it would be nice to have more user isolation here
WORKDIR /FrinexBuildService
VOLUME ["protectedDirectory:/FrinexBuildService/protected"]
VOLUME ["buildServerTarget:/FrinexBuildService/artifacts"]
RUN chown www-data:www-data /usr/local/apache2/logs
USER www-data
