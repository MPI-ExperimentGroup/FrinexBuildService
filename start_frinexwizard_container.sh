#!/bin/bash

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
# @since 01 December 2021 12:50 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")/src/main/
workingDir=$(pwd -P)

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # build the frinexwizard dockerfile
    docker build --no-cache -f docker/frinexwizard.Dockerfile -t frinexwizard:latest .

    # remove the old frinexwizard
    docker stop frinexwizard
    docker container rm frinexwizard

    # start the frinexwizard container
    docker run --restart unless-stopped -dit --name frinexwizard -v WizardTemplates:/ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/ -p 7070:8080 frinexwizard:latest
fi;

# docker run -it --name frinexwizard bash
