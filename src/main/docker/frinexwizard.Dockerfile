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

FROM eclipse-temurin:21-jdk-alpine
# RUN apt-get update
# RUN apt-get -y upgrade
# RUN apt-get -y install maven vim git
RUN apk add --no-cache maven vim git bash
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
RUN mkdir /FrinexWizardUtils
RUN mkdir /FrinexExperiments
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/artifacts
COPY docker/compile_wizard_tempates.sh /FrinexWizardUtils/
RUN chmod +x /FrinexWizardUtils/compile_wizard_tempates.sh
RUN /FrinexWizardUtils/compile_wizard_tempates.sh

# TODO: for now we are not using postgres
RUN cd /ExperimentTemplate \
    && sed -i 's/org.postgresql/com.h2database/' /ExperimentTemplate/ExperimentDesigner/pom.xml \
    && sed -i 's/postgresql/h2/' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i 's/POSTGRESQL/H2/' /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i 's/PostgreSQLDialect/H2Dialect/' /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i 's/org.postgresql.Driver/org.h2.Driver/' /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i 's|jdbc:postgresql://localhost:5432/frinex_experiment_designer_db_admin|jdbc:h2:file:/data/wizard|' /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties \
    && sed -i 's/spring.jpa.show-sql=false/spring.jpa.show-sql=true/' /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties

# apply location specific settings to the various configuration files
COPY docker/filter_config_files.sh /FrinexWizardUtils/
RUN chmod +x /FrinexWizardUtils/filter_config_files.sh
RUN /FrinexWizardUtils/filter_config_files.sh

RUN cd /ExperimentTemplate/ExperimentDesigner \
    && mvn clean install -DskipTests=true -Dmaven.javadoc.skip=true -B -V

RUN cp /ExperimentTemplate/ExperimentDesigner/target/frinex-experiment-designer-*.*-testing-SNAPSHOT.war /frinexwizard.war

RUN adduser -S frinex -u 101010
RUN chown -R frinex /FrinexExperiments
RUN chown -R frinex /FrinexWizardUtils
RUN chown -R frinex /ExperimentTemplate
RUN chown -R frinex /FrinexBuildService
RUN mkdir /data
RUN chown -R frinex /data

ENV WizardUserPass="SetThisPassword"

#CMD ["java", "-Dlogging.level.org.springframework=TRACE", "-jar", "/frinexwizard.war"]
#CMD ["java", "-Dlogging.level.org.springframework=DEBUG", "-jar", "/frinexwizard.war"]
#CMD ["mvn", "spring-boot:run", "-Dspring-boot.run.arguments=--logging.level.org.springframework=TRACE", "-f", "/ExperimentTemplate/ExperimentDesigner/pom.xml"]
# CMD ["java", "-jar", "/frinexwizard.war"]
RUN echo "cd /ExperimentTemplate; git pull; mvn spring-boot:run -f /ExperimentTemplate/ExperimentDesigner/pom.xml" > /updateRunWizard.sh
RUN chmod a+x /updateRunWizard.sh
USER frinex
CMD ["/bin/bash","-c","/updateRunWizard.sh"]
