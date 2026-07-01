#!/bin/bash
#
# Copyright (C) 2026 Max Planck Institute for Psycholinguistics
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
# @since 01 July 2026 (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This CGI triggers build_admin_war.sh so it can be called via HTTP
# from frinex_restart_experient.cgi in the frinex_listing_provider container.
echo "Content-type: text/html"
echo ''
cleanedInput=$(echo "$QUERY_STRING" | sed -En 's/([0-9a-z_]+).*/\1/p')
if [ -z "$cleanedInput" ]; then
    echo "No experiment name provided."
    exit 0
fi
echo "Build triggered for $cleanedInput<br>"
nohup nice sudo -u frinex bash /FrinexBuildService/script/build_admin_war.sh "$cleanedInput" >> /usr/local/apache2/htdocs/frinex_build_admin_war.log 2>&1 &
echo "Build started, check build log for output<br>"
