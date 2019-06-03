# Copyright (C) 2018 Max Planck Institute for Psycholinguistics
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
# @since September 11, 2018 18:48 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM openjdk:8
RUN apt-get update
#RUN apt-get -y upgrade
RUN apt-get -y install unzip zip mono-devel
RUN dpkg --add-architecture i386 && apt-get update && apt-get -y install wine32
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get -y install nodejs
ENV ANDROID_VERSION=28 \
    ANDROID_HOME=/android-sdk \
    ANDROID_BUILD_TOOLS_VERSION=27.0.3
RUN mkdir /android-sdk \
    && cd /android-sdk \
    && curl -o sdk-tools.zip "https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip" \
    && unzip sdk-tools.zip \
    && rm sdk-tools.zip \
    && yes | /android-sdk/tools/bin/sdkmanager --licenses
RUN /android-sdk/tools/bin/sdkmanager --update
RUN /android-sdk/tools/bin/sdkmanager "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
    "platforms;android-${ANDROID_VERSION}" \
    "platform-tools"
#RUN apt-get -y install git node.js npm mono-devel
#RUN npm config set strict-ssl false # todo: remove this stale ssl work around 
RUN npm install npm -g # update npm
RUN npm install -g cordova@8.1.2
RUN npm install -g electron-forge
RUN electron-forge init init-setup-project
RUN cd init-setup-project \
&& npm install express
RUN sed -i 's/\"squirrel/\"zip/g' init-setup-project/package.json \
 && cat init-setup-project/package.json 
RUN cd init-setup-project \
    && electron-forge make --platform=win32
RUN cd init-setup-project \
    && electron-forge make --platform=darwin
#RUN cd init-setup-project \
#    && electron-forge make --platform=linux --arch=ia32 
#RUN cd init-setup-project \
#    && electron-forge make --platform=linux --arch=x64
#RUN npm install -g electron-forge
#RUN /usr/bin/npm install -g electron-compile
#CMD ["/bin/bash"] [ls /target]#, "/target/setup-cordova.sh"]
#WORKDIR /home/petwit/docker-testing
COPY android-keys /android-keys
RUN mkdir /FieldKitRecorder
RUN apt-get -y install gradle
RUN apt-get -y install zip imagemagick
RUN cordova create testapp nl.mpi.tg.eg.testapp testapp
#RUN cd testapp \
#    && cordova platform add ios
RUN cd testapp \
    && cordova platform add android
RUN cd testapp \
    && cordova requirements
RUN cd testapp \
    && cordova build

RUN apt-get -y install maven

RUN git clone --depth 30000 https://github.com/MPI-ExperimentGroup/ExperimentTemplate.git

RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /ExperimentTemplate/pom.xml

RUN cd /ExperimentTemplate \
    && sed -i '/war/{n;s/0.1-testing-SNAPSHOT/0.1.'$(git rev-list --count --all gwt-cordova)'-testing/}' gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/adaptive-vocabulary-assessment-module/{n;s/0.1-testing-SNAPSHOT/0.1.'$(git rev-list --count --all AdaptiveVocabularyAssessmentModule)'-testing/}' /ExperimentTemplate/AdaptiveVocabularyAssessmentModule/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/Frinex Experiment Designer/{n;s/0.1-testing-SNAPSHOT/0.1.'$(git rev-list --count --all ExperimentDesigner)'-testing/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-admin/{n;s/0.1-testing-SNAPSHOT/0.1.'$(git rev-list --count --all registration)'-testing/}' /ExperimentTemplate/registration/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/common/{n;s/0.1-testing-SNAPSHOT/0.1.'$(git rev-list --count --all common)'-testing/}' /ExperimentTemplate/common/pom.xml /ExperimentTemplate/registration/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml \
    && sed -i '/common/{n;s/${project.version}/0.1.'$(git rev-list --count --all common)'-testing/}' /ExperimentTemplate/AdaptiveVocabularyAssessmentModule/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/0.1-testing-SNAPSHOT/0.1.'$(expr $(git rev-list --count --all) - 1)'-testing/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml \
    && sed -i '/Frinex Parent/{n;s/0.1-testing-SNAPSHOT/0.1.'$(expr $(git rev-list --count --all) - 1)'-testing/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml

RUN cd /ExperimentTemplate \
    && mvn install

WORKDIR /target
#VOLUME ["/target"]
