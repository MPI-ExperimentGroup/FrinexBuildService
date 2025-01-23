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
# @since 8 June 2022 8:36 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM eclipse-temurin:21-jdk-alpine

RUN apk add --no-cache git bash unzip zip imagemagick graphviz maven vim file

# the webjars for recorderjs are all very out of date, so we reply on a checked out copy of https://github.com/chris-rudmin/opus-recorder.git-->
RUN git clone https://github.com/chris-rudmin/opus-recorder.git
RUN cd opus-recorder; git checkout tags/v8.0.4
#RUN cd opus-recorder; git checkout tags/v6.2.0 # v6.2.0 is the last version used on the old build server and is available as a tag in 1.3-audiofix

# clone the Frinex repository including enough depth to give correct build numbers
RUN git clone --depth 30000 https://github.com/MPI-ExperimentGroup/ExperimentTemplate.git

# clone the AdaptiveVocabularyAssessmentModule repository including enough depth to give correct build numbers
# RUN git clone --depth 30000 https://github.com/MPI-ExperimentGroup/AdaptiveVocabularyAssessmentModule.git
# RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /AdaptiveVocabularyAssessmentModule/pom.xml
# RUN sed -i 's|<versionCheck.buildType>testing</versionCheck.buildType>|<versionCheck.buildType>stable</versionCheck.buildType>|g' /AdaptiveVocabularyAssessmentModule/pom.xml
# RUN cd /AdaptiveVocabularyAssessmentModule \
#     && sed -i '/adaptive-vocabulary-assessment-module/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all AdaptiveVocabularyAssessmentModule)'-stable/}' /AdaptiveVocabularyAssessmentModule/AdaptiveVocabularyAssessmentModule/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml \
#     && sed -i '/common/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all common)'-stable/}' /AdaptiveVocabularyAssessmentModule/AdaptiveVocabularyAssessmentModule/pom.xml

# make the .m2 directory that will later be a volume
RUN mkdir /maven
RUN mkdir /maven/.m2
RUN mkdir /target
RUN mkdir /test_data_electron
RUN mkdir /test_data_cordova
# add a frinex user here and do all further actions with that user
RUN adduser -S frinex -u 101010
RUN chown -R frinex /ExperimentTemplate
RUN chown -R frinex /maven
RUN chown -R frinex /target
RUN chown -R frinex /test_data_electron
RUN chown -R frinex /test_data_cordova
RUN chown -R frinex /opus-recorder
USER frinex

RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /ExperimentTemplate/pom.xml
RUN sed -i 's|<versionCheck.buildType>testing</versionCheck.buildType>|<versionCheck.buildType>stable</versionCheck.buildType>|g' /ExperimentTemplate/pom.xml

RUN cd /ExperimentTemplate \
    && sed -i '/war/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all gwt-cordova)'-stable/}' gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/Frinex Experiment Designer/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all ExperimentDesigner)'-stable/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-admin/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all registration)'-stable/}' /ExperimentTemplate/registration/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/common/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all common)'-stable/}' /ExperimentTemplate/common/pom.xml /ExperimentTemplate/registration/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-experiment-designer/{n;s/-testing-SNAPSHOT/.'$(git rev-list --count --all ExperimentDesigner)'-stable/}' /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml \
    && sed -i '/Frinex Parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git rev-list --count --all) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml

RUN mkdir /ExperimentTemplate/target

RUN cd /ExperimentTemplate \
    && mvn clean install -Dgwt.validateOnly -DskipTests=true -Dmaven.javadoc.skip=true -B -V
RUN cd /ExperimentTemplate \
    && mvn clean install -Dgwt.draftCompile=true -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150 -DskipTests=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=alloptions
RUN cd /ExperimentTemplate/gwt-cordova \
    && mvn -q -Dexec.executable="echo" -Dexec.args='${project.version}' --non-recursive exec:exec > /ExperimentTemplate/gwt-cordova.version

# RUN cd /ExperimentTemplate \
#     && mvn clean install -Dgwt.draftCompile=true -DskipTests=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=with_stimulus_example

RUN cd /ExperimentTemplate/gwt-cordova \
    && magick -size 128x128 xc:blue /ExperimentTemplate/gwt-cordova/src/main/static/with_stimulus_example/icon.png \
    && magick -size 512x513 xc:blue /ExperimentTemplate/gwt-cordova/src/main/static/with_stimulus_example/splash.png
    # && magick convert -gravity center -size 128x128 -background blue -fill white -pointsize 80 label:"WSE" /ExperimentTemplate/gwt-cordova/src/main/static/with_stimulus_example/icon.png \
    # && magick convert -gravity center -size 512x513 -background blue -fill white -pointsize 80 label:"WSE" /ExperimentTemplate/gwt-cordova/src/main/static/with_stimulus_example/splash.png
RUN cd /ExperimentTemplate/gwt-cordova \
    && mvn clean install -Dgwt.draftCompile=true -DskipTests=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=with_stimulus_example -Dexperiment.configuration.displayName=with_stimulus_example -Dexperiment.configuration.path=/ExperimentTemplate/ExperimentDesigner/src/main/resources/examples/
RUN mkdir /test_data_electron/with_stimulus_example \
    && cp /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /test_data_electron/with_stimulus_example/ \
    && cp /ExperimentTemplate/gwt-cordova/target/with_stimulus_example*-electron.zip /test_data_electron/with_stimulus_example/
RUN mkdir /test_data_cordova/with_stimulus_example \
    && cp /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /test_data_cordova/with_stimulus_example/ \
    && cp /ExperimentTemplate/gwt-cordova/target/with_stimulus_example*-cordova.zip /test_data_cordova/with_stimulus_example/

RUN cd /ExperimentTemplate/gwt-cordova \
    && mkdir /ExperimentTemplate/gwt-cordova/src/main/static/rosselfieldkit \
    && magick -size 128x128 xc:blue /ExperimentTemplate/gwt-cordova/src/main/static/rosselfieldkit/icon.png \
    && magick -size 512x513 xc:blue /ExperimentTemplate/gwt-cordova/src/main/static/rosselfieldkit/splash.png
    # && magick convert -gravity center -size 128x128 -background blue -fill white -pointsize 80 label:"RFK" /ExperimentTemplate/gwt-cordova/src/main/static/rosselfieldkit/icon.png \
    # && magick convert -gravity center -size 512x512 -background blue -fill white -pointsize 80 label:"RFK" /ExperimentTemplate/gwt-cordova/src/main/static/rosselfieldkit/splash.png
RUN cd /ExperimentTemplate/gwt-cordova \
    && mvn clean install -Dgwt.draftCompile=true -DskipTests=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=rosselfieldkit -Dexperiment.configuration.displayName=rosselfieldkit
RUN mkdir /test_data_electron/rosselfieldkit \
    && cp /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /test_data_electron/rosselfieldkit/ \
    && cp /ExperimentTemplate/gwt-cordova/target/rosselfieldkit*-electron.zip /test_data_electron/rosselfieldkit/
RUN mkdir /test_data_cordova/rosselfieldkit \
    && cp /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /test_data_cordova/rosselfieldkit/ \
    && cp /ExperimentTemplate/gwt-cordova/target/rosselfieldkit*-cordova.zip /test_data_cordova/rosselfieldkit/

RUN cd /ExperimentTemplate/gwt-cordova/ \
    && mvn clean
RUN cd /ExperimentTemplate/registration/ \
    && mvn clean
    # clean out the static directory to prevent these files being used in the automated builds
RUN rm -r /ExperimentTemplate/gwt-cordova/src/main/static/*

WORKDIR /target
#VOLUME ["m2Directory:/maven/.m2/", "webappsTomcatStaging:/usr/local/tomcat/webapps"]
