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
# @since 19 May 2021 16:51 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM httpd:2.4-alpine
RUN apk add --no-cache \
  curl \
  bash \
  rsync \
  postgresql-client \
  sudo
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/cgi
COPY config/frinex_db_manager.conf  /FrinexBuildService/
COPY frinex_db_manager.cgi  /FrinexBuildService/cgi/
# make sure the mod_cgi module is loaded by httpd
RUN sed -i "/^LoadModule alias_module modules\/mod_alias.so/a LoadModule cgi_module modules/mod_cgi.so" /usr/local/apache2/conf/httpd.conf
#RUN sed -i "s|BuildServerUrl|http://example.com|g" /FrinexBuildService/cgi/frinex_db_manager.cgi
#RUN sed -i "s|TargetDirectory|/FrinexBuildService/artifacts|g" /FrinexBuildService/cgi/frinex_db_manager.cgi
RUN cat /FrinexBuildService/frinex_db_manager.conf >> /usr/local/apache2/conf/httpd.conf
RUN echo '%daemon ALL=(ALL) NOPASSWD: /usr/bin/psql' >> /etc/sudoers
# provide an authentication menthod for the CGI script
RUN echo "example.com:5432:postgres:frinex_db_user:examplepassword" > /FrinexBuildService/frinex_db_user_authentication
RUN chown -R daemon:daemon /FrinexBuildService
RUN chmod -R ug+rwx /FrinexBuildService
RUN chown -R daemon:daemon /FrinexBuildService/cgi
RUN chmod -R ug+rwx /FrinexBuildService/cgi
RUN chmod 600 /FrinexBuildService/frinex_db_user_authentication
WORKDIR /FrinexBuildService