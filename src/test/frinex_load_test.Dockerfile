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
# @since 04 Jan 2023 14:33 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#
FROM httpd:2.4-alpine
RUN apk add --no-cache \
  curl \
  bash
RUN mkdir /frinex_load_test
RUN mkdir /frinex_load_test/test_data
COPY frinex_stress_test/test_data/100ms_v.mp4 /frinex_load_test/test_data
COPY frinex_stress_test/test_data/100ms_a.ogg /frinex_load_test/test_data

COPY frinex_stress_test/load_participant.sh /frinex_load_test/
COPY frinex_stress_test/load_test.sh /frinex_load_test/
RUN chmod a+x /frinex_load_test/load_*.sh
WORKDIR /frinex_load_test/
