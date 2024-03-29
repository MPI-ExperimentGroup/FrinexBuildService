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
FROM httpd:2.4-alpine
RUN apk add --no-cache \
  curl \
  bash \
  rsync \
  docker \
  sudo
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/cgi
COPY cgi/frinex_locations_update.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_staging_upstreams.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_staging_locations.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_production_upstreams.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_production_locations.cgi  /FrinexBuildService/cgi/
COPY cgi/frinex_tomcat_staging_locations.cgi  /FrinexBuildService/cgi/
COPY config/frinex_db_manager.conf  /FrinexBuildService/
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
RUN cat /FrinexBuildService/frinex_db_manager.conf >> /usr/local/apache2/conf/httpd.conf
RUN echo 'www-data ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers
RUN chown -R www-data:daemon /FrinexBuildService
RUN chown -R www-data:daemon /usr/local/apache2/htdocs/
RUN chmod -R ug+rwx /FrinexBuildService
WORKDIR /FrinexBuildService
RUN chown www-data:www-data /usr/local/apache2/logs
USER www-data
