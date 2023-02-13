#!/bin/bash

# Copyright (C) 2023 Max Planck Institute for Psycholinguistics
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
# @since 13 Feb 2023 14:09 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM frinexapps-jdk:alpha

RUN cd /ExperimentTemplate \
    && git checkout pom.xml */pom.xml \
    && git pull

RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /ExperimentTemplate/pom.xml
RUN sed -i 's|<versionCheck.buildType>testing</versionCheck.buildType>|<versionCheck.buildType>snapshot</versionCheck.buildType>|g' /ExperimentTemplate/pom.xml

RUN cd /ExperimentTemplate \
    && sed -i '/war/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all gwt-cordova)'-snapshot/}' gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/Frinex Experiment Designer/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all ExperimentDesigner)'-snapshot/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-admin/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all registration)'-snapshot/}' /ExperimentTemplate/registration/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/common/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all common)'-snapshot/}' /ExperimentTemplate/common/pom.xml /ExperimentTemplate/registration/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-experiment-designer/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all ExperimentDesigner)'-snapshot/}' /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-snapshot/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml \
    && sed -i '/Frinex Parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-snapshot/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml

RUN cd /ExperimentTemplate \
    && mvn clean install -Dgwt.draftCompile=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=alloptions
RUN cd /ExperimentTemplate/gwt-cordova \
    && mvn -q -Dexec.executable="echo" -Dexec.args='${project.version}' --non-recursive exec:exec > /ExperimentTemplate/gwt-cordova.version

#RUN cd /ExperimentTemplate \
#    && sed -i 's/same-origin/*/g' /ExperimentTemplate/registration/src/main/java/nl/mpi/tg/eg/frinex/rest/FrinexCORSFilter.java \
#    && sed -i 's/Content-type/*/g' /ExperimentTemplate/registration/src/main/java/nl/mpi/tg/eg/frinex/rest/FrinexCORSFilter.java \
#    && sed -i 's/require-corp/*/g' /ExperimentTemplate/registration/src/main/java/nl/mpi/tg/eg/frinex/rest/FrinexCORSFilter.java

RUN cd /ExperimentTemplate \
    && git diff
