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
# @since 8 June 2022 15:39 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM node:22-bullseye
# FROM eclipse-temurin:11-jdk-jammy
#ENV JAVA_OPTS="--add-modules java.se.ee"
# installing node this way has been depricated
# RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN dpkg --add-architecture i386
# RUN apt-get update
# RUN apt-get -y install unzip zip mono-devel build-essential imagemagick nodejs vim wine32 file ca-certificates curl gnupg git
RUN apt-get update && apt-get install -y \
    unzip \
    zip \
    mono-devel \
    build-essential \
    imagemagick \
    vim \
    wine32 \
    file \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g yarn

# install node the updated way
# RUN mkdir -p /etc/apt/keyrings
# RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
# RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
# RUN apt-get update
# RUN apt-get install nodejs -y
# end install node the updated way

#RUN apt-get -y install git node.js npm mono-devel
#RUN npm config set strict-ssl false # todo: remove this stale ssl work around 
# RUN npm install npm -g # update npm
#RUN npm install -g electron-forge asar
#RUN electron-forge init init-setup-project
#RUN cd init-setup-project \
#&& npm install express
#RUN sed -i 's/\"squirrel/\"zip/g' init-setup-project/package.json \
# && cat init-setup-project/package.json 
#RUN cd init-setup-project \
#    && electron-forge make --platform=win32
#RUN cd init-setup-project \
#    && electron-forge make --platform=darwin
#RUN cd init-setup-project \
#    && electron-forge make --platform=linux --arch=ia32 
#RUN cd init-setup-project \
#    && electron-forge make --platform=linux --arch=x64
#RUN npm install -g electron-forge
#RUN /usr/bin/npm install -g electron-compile
#CMD ["/bin/bash"] [ls /target]#, "/target/setup-cordova.sh"]

#RUN mkdir /electron
#RUN wget https://github.com/electron/electron/releases/download/v2.0.10/electron-v2.0.10-darwin-x64.zip -O /electron/darwin-x64.zip
#RUN wget https://github.com/electron/electron/releases/download/v2.0.10/electron-v2.0.10-win32-x64.zip -O /electron/win32-x64.zip

# RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
# RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
# RUN apt update && apt install yarn

RUN git clone https://github.com/electron-userland/electron-webpack-quick-start.git
RUN cd electron-webpack-quick-start \
    && yarn \
    && yarn upgrade --latest \
    && yarn dist
RUN cd electron-webpack-quick-start \
    && yarn dist --win portable
RUN cd electron-webpack-quick-start \
    && yarn dist --mac zip
RUN cd electron-webpack-quick-start \
    && stat dist/electron-webpack-quick-start-0.0.0-mac.zip \
    && stat dist/electron-webpack-quick-start\ 0.0.0.exe
#    && start dist/electron-webpack-quick-start-0.0.0.dmg

COPY test_data_electron /test_data_electron

RUN cd /test_data_electron/with_stimulus_example \
    && bash /test_data_electron/with_stimulus_example/setup-electron.sh \
    && stat /test_data_electron/with_stimulus_example/with_stimulus_example-win32-x64.zip \
    && stat /test_data_electron/with_stimulus_example/with_stimulus_example-darwin-x64.zip

# RUN cd /test_data_electron/rosselfieldkit \
#     && bash /test_data_electron/rosselfieldkit/setup-electron.sh \
#     && stat /test_data_electron/rosselfieldkit/rosselfieldkit-win32-x64.zip \
#     && stat /test_data_electron/rosselfieldkit/rosselfieldkit-darwin-x64.zip

# clean out the static directory to prevent these files being used in the automated builds
RUN rm -r /test_data_electron

RUN mkdir /target
WORKDIR /target
