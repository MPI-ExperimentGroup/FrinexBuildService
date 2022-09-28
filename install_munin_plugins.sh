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
# @since 28 March 2022 11:11 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # get the latest version of this repository
    git pull

    # copy the service health plugin to the munin plugins directory
    sudo mkdir -p /srv/frinex_munin_data/health
    cp script/frinex_service_health_munin_plugin.sh /tmp/frinex_service_health_munin_plugin.sh
    chmod 777 /tmp/frinex_service_health_munin_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_service_health
    sudo mv /tmp/frinex_service_health_munin_plugin.sh /usr/lib/munin/plugins/frinex_service_health
    sudo chmod 775 /usr/lib/munin/plugins/frinex_service_health
    sudo chown root:root /usr/lib/munin/plugins/frinex_service_health
    sudo ln -s /usr/lib/munin/plugins/frinex_service_health /etc/munin/plugins/frinex_service_health
    sudo ln -s /usr/lib/munin/plugins/frinex_service_health /etc/munin/plugins/frinex_staging_web
    sudo ln -s /usr/lib/munin/plugins/frinex_service_health /etc/munin/plugins/frinex_staging_admin
    sudo ln -s /usr/lib/munin/plugins/frinex_service_health /etc/munin/plugins/frinex_production_web
    sudo ln -s /usr/lib/munin/plugins/frinex_service_health /etc/munin/plugins/frinex_production_admin

    # instal the swarm node stats plugin
    cp script/frinex_swarm_nodes_munin_plugin.sh /tmp/frinex_swarm_nodes_munin_plugin.sh
    chmod 777 /tmp/frinex_swarm_nodes_munin_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_swarm_nodes
    sudo mv /tmp/frinex_swarm_nodes_munin_plugin.sh /usr/lib/munin/plugins/frinex_swarm_nodes
    sudo chmod 775 /usr/lib/munin/plugins/frinex_swarm_nodes
    sudo chown root:root /usr/lib/munin/plugins/frinex_swarm_nodes
    sudo ln -s /usr/lib/munin/plugins/frinex_swarm_nodes /etc/munin/plugins/frinex_swarm_nodes_node1_node2_node3

    # instal the experiment stats plugin and working directory
    sudo mkdir -p /srv/frinex_munin_data/stats
    cp script/frinex_experiment_stats_munin_plugin.sh /tmp/frinex_experiment_stats_munin_plugin.sh
    chmod 777 /tmp/frinex_experiment_stats_munin_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_experiment_stats
    sudo mv /tmp/frinex_experiment_stats_munin_plugin.sh /usr/lib/munin/plugins/frinex_experiment_stats
    sudo chmod 775 /usr/lib/munin/plugins/frinex_experiment_stats
    sudo chown root:root /usr/lib/munin/plugins/frinex_experiment_stats
    sudo ln -s /usr/lib/munin/plugins/frinex_experiment_stats /etc/munin/plugins/frinex_experiment_stats

    # instal the tomcat experiment stats plugin and working directories
    sudo mkdir -p /srv/frinex_munin_data/stats_tomcat_frinexstaging
    sudo mkdir -p /srv/frinex_munin_data/stats_tomcat_frinexproduction
    sudo mkdir -p /srv/frinex_munin_data/stats_tomcat_productionother
    cp script/frinex_experiment_stats_munin_tomcat_plugin.sh /tmp/frinex_experiment_stats_munin_tomcat_plugin.sh
    chmod 777 /tmp/frinex_experiment_stats_munin_tomcat_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_experiment_stats_tomcat
    sudo mv /tmp/frinex_experiment_stats_munin_tomcat_plugin.sh /usr/lib/munin/plugins/frinex_experiment_stats_tomcat
    sudo chmod 775 /usr/lib/munin/plugins/frinex_experiment_stats_tomcat
    sudo chown root:root /usr/lib/munin/plugins/frinex_experiment_stats_tomcat
    sudo ln -s /usr/lib/munin/plugins/frinex_experiment_stats_tomcat /etc/munin/plugins/frinex_experiment_stats_frinexstaging
    sudo ln -s /usr/lib/munin/plugins/frinex_experiment_stats_tomcat /etc/munin/plugins/frinex_experiment_stats_frinexproduction
    sudo ln -s /usr/lib/munin/plugins/frinex_experiment_stats_tomcat /etc/munin/plugins/frinex_experiment_stats_productionother

    # instal the external experiment stats plugin and working directories
    cp script/frinex_external_experiment_stats_munin_tomcat_plugin.sh /tmp/frinex_external_experiment_stats_munin_tomcat_plugin.sh
    chmod 777 /tmp/frinex_external_experiment_stats_munin_tomcat_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_external_experiment_stats_
    sudo mv /tmp/frinex_external_experiment_stats_munin_tomcat_plugin.sh /usr/lib/munin/plugins/frinex_external_experiment_stats_
    sudo chmod 775 /usr/lib/munin/plugins/frinex_external_experiment_stats_
    sudo chown root:root /usr/lib/munin/plugins/frinex_external_experiment_stats_
    sudo mkdir -p /srv/frinex_munin_data/frinex_external_experiment_stats
    sudo ln -s /usr/lib/munin/plugins/frinex_external_experiment_stats_ /etc/munin/plugins/frinex_external_experiment_stats_https_host_port_experiment

    # instal the experiment tomcat plugin and working directory
    sudo mkdir -p /srv/frinex_munin_data/tomcat
    cp script/frinex_munin_tomcat_plugin.sh /tmp/frinex_munin_tomcat_plugin.sh
    chmod 777 /tmp/frinex_munin_tomcat_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_tomcat_stats
    sudo mv /tmp/frinex_munin_tomcat_plugin.sh /usr/lib/munin/plugins/frinex_tomcat_stats
    sudo chmod 775 /usr/lib/munin/plugins/frinex_tomcat_stats
    sudo chown root:root /usr/lib/munin/plugins/frinex_tomcat_stats
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_staging_web
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_staging_admin
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_production_web
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_production_admin
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_productionb_web
    sudo ln -s /usr/lib/munin/plugins/frinex_tomcat_stats /etc/munin/plugins/frinex_tomcat_productionb_admin

    # instal the frinex build server stats plugin and working directory
    sudo mkdir -p /srv/frinex_munin_data/builds
    cp script/frinex_build_stats_munin_plugin.sh /tmp/frinex_build_stats_munin_plugin.sh
    chmod 777 /tmp/frinex_build_stats_munin_plugin.sh
    sudo rm /usr/lib/munin/plugins/frinex_build_stats
    sudo mv /tmp/frinex_build_stats_munin_plugin.sh /usr/lib/munin/plugins/frinex_build_stats
    sudo chmod 775 /usr/lib/munin/plugins/frinex_build_stats
    sudo chown root:root /usr/lib/munin/plugins/frinex_build_stats
    sudo ln -s /usr/lib/munin/plugins/frinex_build_stats /etc/munin/plugins/frinex_build_example0
    sudo ln -s /usr/lib/munin/plugins/frinex_build_stats /etc/munin/plugins/frinex_build_example1

    # instal the frinex tomcat docker ratio plugin and working directory
    sudo mkdir -p /srv/frinex_munin_data/frinex_proxy_status
    cp script/frinex_munin_proxy_status.sh /tmp/frinex_munin_proxy_status.sh
    chmod 777 /tmp/frinex_munin_proxy_status.sh
    sudo rm /usr/lib/munin/plugins/frinex_proxy_status_
    sudo mv /tmp/frinex_munin_proxy_status.sh /usr/lib/munin/plugins/frinex_proxy_status_
    sudo chmod 775 /usr/lib/munin/plugins/frinex_proxy_status_
    sudo chown root:root /usr/lib/munin/plugins/frinex_proxy_status_
    sudo ln -s /usr/lib/munin/plugins/frinex_proxy_status_ /etc/munin/plugins/frinex_proxy_status_tomcaturl_nginxurl_stagingorproduction

    # boot strap the experiment stats plugin data directly from postgres
    docker run -v /srv/frinex_munin_data/stats:/frinex_munin_stats -it --rm --name bootstrap_munin_stats frinex_db_manager:latest bash /FrinexBuildService/stats/bootstrap_munin_statistics.sh

    # generate the JSON file containing experiment stats directly from postgres for use in the build server pages
    docker run -v buildServerTarget:/FrinexBuildService/artifacts -it --rm --name bootstrap_public_stats frinex_db_manager:latest bash -c "/FrinexBuildService/stats/bootstrap_public_statistics.sh >> /FrinexBuildService/artifacts/staging_public_stats.json"

    # please note that the following needs to be added to /etc/munin/plugin-conf.d/munin-node
    #   [frinex_*]
    #   group docker
fi;
