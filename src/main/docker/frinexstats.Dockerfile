# Copyright (C) 2024 Max Planck Institute for Psycholinguistics
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
# @since 02 December 2024 15:19 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM grafana/grafana-oss
RUN grafana-cli plugins install yesoreyeram-infinity-datasource
RUN grafana-cli admin reset-admin-password Frinex
ENV GF_AUTH_ANONYMOUS_ENABLED=true
ENV GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
ENV GF_AUTH_BASIC_ENABLED=false
# ENV GF_AUTH_DISABLE_LOGIN_FORM=true
# ENV GF_AUTH_DISABLE_SIGNOUT_MENU=true
ENV GF_SECURITY_ALLOW_EMBEDDING=true
ENV GF_SERVER_SERVE_FROM_SUB_PATH=true  
ENV GF_SERVE_FROM_SUB_PATH=true
# ADD config/provisioning /etc/grafana/provisioning
# ADD config/dashboards /var/lib/grafana/dashboards
# COPY config/dashboards /etc/grafana/provisioning/dashboards
# COPY config/dashboards/frinex_stats_grafana.json /usr/share/grafana/public/dashboards/home.json
COPY config/dashboards/frinex_stats_grafana.json /etc/grafana/provisioning/dashboards/home.json
COPY config/dashboards/default.yaml /etc/grafana/provisioning/dashboards/default.yaml
COPY config/dashboards/datasource.yaml /etc/grafana/provisioning/datasources/datasource.yaml
ENV GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/etc/grafana/provisioning/dashboards/home.json
USER "$GF_UID"
