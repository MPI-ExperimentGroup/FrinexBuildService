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
# @since 11 May 2020 12:06 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM frinexbuild:latest

COPY frinex_stress_test/frinex_service_hammer.sh /FrinexBuildService/
COPY frinex_stress_test/log_service_hammer.sh /FrinexBuildService/
COPY frinex_stress_test/hammer_services.sh /FrinexBuildService/
RUN mkdir /FrinexBuildService/test_data
COPY static/test_data/100ms_v.mp4 /FrinexBuildService/test_data
COPY static/test_data/100ms_a.ogg /FrinexBuildService/test_data

COPY frinex_stress_test/frinex_build_test.sh /FrinexBuildService/
