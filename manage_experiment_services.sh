#!/bin/bash

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
# @since 23 May 2024 15:34 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)

# this script will check which experiments have been recently used 
# and make sure those services are running and healthy. Any experiment
# that has not been recently used will be terminated. Recent use is determined
# by how long the service has been up and the most recent participant activity.
# If a terminated experiment is accessed via NGINX, it will be automatically 
# started by a speparate CGI script

# this process is also handled by the frinex_service_manager which is started with frinexbuild
docker run -v buildServerTarget:/FrinexBuildService/artifacts --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock -it --rm --name manage_experiment_services frinex_listing_provider:latest bash -c "/FrinexBuildService/sleep_and_resurrect_docker_experiments.sh"
