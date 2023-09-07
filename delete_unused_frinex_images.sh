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
# @since 07 September 2023 17:47 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#


# search through all staging web war files extracting a list of Frinex versions in use
excludeList=(docker run --rm -v buildServerTarget:/FrinexBuildService/artifacts -it --name frinex-images-cleanup frinexbuild:latest bash -c "(for warFile in artifacts/*/*_staging_web.war;do unzip -p $warFile version.json | grep projectVersion; done;) | sort | uniq | sed "s/projectVersion:'/-v /g" | sed "s/',//g" | tr '\n' ' '")
echo $excludeList

# TODO: grep the docker image ls minus the exclude list and remove the remaining images after warning the user
