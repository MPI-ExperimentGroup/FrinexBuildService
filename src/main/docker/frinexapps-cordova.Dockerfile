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
# @since 8 June 2022 14:30 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM node:22-bullseye
# FROM eclipse-temurin:11-jdk-jammy
# RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
# RUN dpkg --add-architecture i386
RUN apt-get update # --fix-missing
RUN apt-get -y upgrade # --fix-missing
RUN apt-get update && apt-get install -y \
    openjdk-11-jdk \
    unzip \
    file \
    imagemagick \
    vim \
    gnupg \
    zip \
    git \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# install node the updated way
# RUN mkdir -p /etc/apt/keyrings
# RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
# RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
# RUN apt-get update
# RUN apt-get install nodejs -y
# end install node the updated way

# set up gradle manually so we get a more recent version
ENV PATH=${PATH}:/opt/gradle/bin
RUN mkdir /opt/gradle \
    && wget https://services.gradle.org/distributions/gradle-7.5.1-bin.zip \
    && unzip -d /opt/gradle gradle-*-bin.zip \
    && mv /opt/gradle/gradle-*/bin /opt/gradle/ \
    && mv /opt/gradle/gradle-*/lib /opt/gradle/ \
    && rm gradle-*-bin.zip

ENV ANDROID_VERSION=33 \
    ANDROID_SDK_ROOT=/android-sdk \
    ANDROID_HOME=/android-sdk \
    # ANDROID_BUILD_TOOLS_VERSION=34.0.0-rc3
    ANDROID_BUILD_TOOLS_VERSION=30.0.3
    # ANDROID_BUILD_TOOLS_VERSION=32.0.0
ENV PATH=${PATH}:/android-sdk/platform-tools:/android-sdk/cmdline-tools
# the listing of commandlinetools can be found here https://developer.android.com/studio#command-tools
RUN mkdir /android-sdk \
    && cd /android-sdk \
    && curl -o cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip"
#    && curl -o sdk-tools.zip "https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip" \
RUN mkdir /android-sdk/cmdline-tools \
    && unzip -d /android-sdk/cmdline-tools /android-sdk/cmdline-tools.zip \
    && rm /android-sdk/cmdline-tools.zip \
    && mv /android-sdk/cmdline-tools/cmdline-tools /android-sdk/cmdline-tools/latest \
    && yes | /android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses
RUN /android-sdk/cmdline-tools/latest/bin/sdkmanager --update
RUN /android-sdk/cmdline-tools/latest/bin/sdkmanager \
    "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
    "platforms;android-${ANDROID_VERSION}"
    #  "platform-tools" \
RUN npm install npm -g # update npm
RUN npm install -g cordova@11.1.0
# rolled back to version 10 to address the admin connection issues
# RUN npm install -g cordova@10.0.0
# rolling back to 11 because the connection issues with the admin was due to invalid server certificates

# clone the Frinex repository so that the FieldKitRecorder is available
RUN git clone https://github.com/MPI-ExperimentGroup/ExperimentTemplate.git

COPY android-keys/frinex-build.json /android-keys/
COPY android-keys/frinex-cordova.jks /android-keys/
COPY corova-plugins /corova-plugins

COPY test_data_cordova /test_data_cordova

RUN cd /test_data_cordova/with_stimulus_example \
    && bash /test_data_cordova/with_stimulus_example/setup-cordova.sh \
    && stat /test_data_cordova/with_stimulus_example/app-release.apk \
    && stat /test_data_cordova/with_stimulus_example/app-release.aab

RUN cd /test_data_cordova/rosselfieldkit \
    && bash /test_data_cordova/rosselfieldkit/setup-cordova.sh \
    && stat /test_data_cordova/rosselfieldkit/app-release.apk \
    && stat /test_data_cordova/rosselfieldkit/app-release.aab

# clean out the test directory to prevent these files being used in the automated builds
RUN rm -r /test_data_cordova

RUN mkdir /target
WORKDIR /target
