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
# @since 23 July 2021 15:35 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

cd $(dirname "$0")
workingDir=$(pwd -P)
cd $(dirname "$0")/src/main/

# check that the properties to be used match the current machine
if ! grep -q $(hostname) config/publish.properties; then 
    echo "Aborting because the publish.properties does not match the current machine.";
else
    # tag the old beta
    docker tag frinexapps-jdk:beta frinexapps-jdk:beta_$(date +%F)
    # tag alpha as the new beta
    docker tag frinexapps-jdk:alpha frinexapps-jdk:beta

    # tag the old cordova beta
    docker tag frinexapps-cordova:beta frinexapps-cordova:beta_$(date +%F)
    # tag alpha as the new beta
    docker tag frinexapps-cordova:alpha frinexapps-cordova:beta

    # tag the old electron beta
    docker tag frinexapps-electron:beta frinexapps-electron:beta_$(date +%F)
    # tag alpha as the new beta
    docker tag frinexapps-electron:alpha frinexapps-electron:beta

    # make the current XSD available for this beta so that they can be used by frinex builds with frinexVersion
    docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:beta /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/beta.xsd"
    docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:beta /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/beta.html"
    # make the changes file available for this beta so that they can be viewed from the build page
    docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:beta /bin/bash -c "cp /ExperimentTemplate/changes.txt /FrinexBuildService/artifacts/betachanges.txt"
    docker run --user root --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /FrinexBuildService frinexbuild:latest /bin/bash -c "chown frinex:www-data /FrinexBuildService/artifacts/*.xsd; chown frinex:www-data /FrinexBuildService/artifacts/*.html; chown frinex:www-data /FrinexBuildService/artifacts/*.txt; chmod a+wr /FrinexBuildService/artifacts/*.txt;"
    docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -w /FrinexBuildService frinexbuild:latest /bin/bash -c "sed -i \"s|webjars/jquery/jquery.min.js|/lib/jquery.min.js|g\" /FrinexBuildService/artifacts/beta.html;"
fi;
