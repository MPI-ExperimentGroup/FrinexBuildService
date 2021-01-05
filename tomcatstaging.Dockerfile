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
# @since 23 December 2020 08:38 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM tomcat:9.0
COPY tomcat-users.xml /usr/local/tomcat/conf/tomcat-users.xml 
RUN mkdir -p /usr/local/tomcat/webapps
RUN cp -R /usr/local/tomcat/webapps.dist/manager /usr/local/tomcat/webapps/
COPY context.xml /usr/local/tomcat/webapps/manager/META-INF/context.xml
RUN catalina.sh run&
VOLUME ["webappsStaging:/usr/local/tomcat/webapps"]
