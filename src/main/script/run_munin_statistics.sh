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

# @since 18 July 2023 16:06 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

# this script replaces the use of cron to periodically generate the munin statistics
while true
do
    # TODO: pipe the output to the relevant files
    # TODO: if the hour is 3am then get the stats, if not then sleep for an hour
    /FrinexBuildService/stats/cronjob_munin_staging_statistics.sh
    /FrinexBuildService/stats/cronjob_munin_production_statistics.sh
    sleep 1h
done