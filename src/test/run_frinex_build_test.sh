#!/bin/bash
#
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
# @since 11 May 2022 14:59 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script runs frinex GWT builds with a range of settings to test the build speed

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

docker build --no-cache -f frinex_stress_test.Dockerfile -t frinex_stress_test:latest .

docker run  -v buildServerTarget:/FrinexBuildService/artifacts --rm -it --name frinex_stress_test frinex_stress_test:latest bash /FrinexBuildService/frinex_build_test.sh
