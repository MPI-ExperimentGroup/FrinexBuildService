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
# @since 14 November 2024 16:28 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

FROM debian:bookworm
RUN apt-get update
RUN apt-get -y install \
  curl \
  bash \
  git \
  openssh-client \
  sudo \
  libicu-dev \
  build-essential
RUN mkdir /FrinexBuildService
RUN mkdir /BuildTools
RUN mkdir /vr-build
RUN adduser frinex
RUN chown -R frinex /FrinexBuildService
RUN chown -R frinex /vr-build
RUN chown -R frinex /BuildTools
COPY .ssh /home/frinex/.ssh
RUN chown -R frinex /home/frinex/.ssh
RUN ssh-keyscan github.com >> /home/frinex/.ssh/known_hosts
USER frinex
RUN cd /BuildTools; git clone --single-branch -b release git@github.com:<EGUE>.git /BuildTools
RUN cd /BuildTools; ./Setup.sh
RUN echo "ls -l /FrinexBuildService/vr-build/*; cp -r /FrinexBuildService/vr-build/* /vr-build; cd /vr-build; ue4 build; ue4 test --filter Product; ue4 package; zip -r /FrinexBuildService/vr-build/temp.zip /vr-build/dist/*; ls -l /vr-build/dist/*;" > /FrinexBuildService/build_experiment.sh
RUN chmod a+x /FrinexBuildService/build_experiment.sh

CMD ["/bin/bash","-c","/FrinexBuildService/build_experiment.sh"]
