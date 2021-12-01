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
# @since 01 December 2021 12:37 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM openjdk:11

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y install maven

# clone the Frinex repository including enough depth to give correct build numbers
RUN git clone --depth 30000 https://github.com/MPI-ExperimentGroup/ExperimentTemplate.git

#RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /ExperimentTemplate/pom.xml
#RUN sed -i 's|<versionCheck.buildType>testing</versionCheck.buildType>|<versionCheck.buildType>stable</versionCheck.buildType>|g' /ExperimentTemplate/pom.xml

#RUN cd /ExperimentTemplate \
#    && sed -i '/Frinex Experiment Designer/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all ExperimentDesigner)'-stable/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
#RUN cd /ExperimentTemplate \
#    && sed -i '/common/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all common)'-stable/}' /ExperimentTemplate/common/pom.xml
#RUN cd /ExperimentTemplate \
#    && sed -i '/frinex-parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml \
#    && sed -i '/Frinex Parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml

# the webjars for recorderjs are all very out of date, so we reply on a checked out copy of https://github.com/chris-rudmin/opus-recorder.git-->
#RUN git clone https://github.com/chris-rudmin/opus-recorder.git
#RUN cd opus-recorder; git checkout tags/v8.0.4

# TODO: the use of template_example here will be replaced by actual templates
RUN cd /ExperimentTemplate \
    && mvn clean install -DskipTests=true -Dmaven.javadoc.skip=true -Dgwt.draftCompile=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=template_example
RUN mkdir /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/ExperimentTemplate /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
#RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/opus-recorder /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/groups.js /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/stomp-websocket /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/grouptestframes.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/grouptestpage.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/version.json /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/scss /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/template_example.xml /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/StyleTestPage.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/index.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/sockjs-client /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/static /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/jquery /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/css /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/
RUN cp -r /ExperimentTemplate/gwt-cordova/target/template_example-frinex-gui-1.4-testing-SNAPSHOT/TestingFrame.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/template_example/

# TODO: for now we are not using postgres
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/postgresql/h2/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/POSTGRESQL/H2/}' /ExperimentDesigner/src/main/resources/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i '/frinex-parent/{n;s/PostgreSQLDialect/H2Dialect/}' /ExperimentDesigner/src/main/resources/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i '/frinex-parent/{n;s/spring.jpa.show-sql=false/spring.jpa.show-sql=true/}' /ExperimentDesigner/src/main/resources/ExperimentDesigner/src/main/resources/application.properties

RUN cd /ExperimentTemplate/ExperimentDesigner \
    && mvn clean install -Dmaven.javadoc.skip=true -B -V

RUN cp /ExperimentTemplate/ExperimentDesigner/target/frinex-experiment-designer-1.4-testing-SNAPSHOT.war /frinexwizard.war

CMD ["java", "-jar", "/frinexwizard.war"]
