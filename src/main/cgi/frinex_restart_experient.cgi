#!/bin/bash
#
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
# @since 18 April 2024 13:59 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script restarts experiment services when accessed by a user via nginx
echo "Content-type: text/html"
echo ''
echo "$(date), $QUERY_STRING" >> /usr/local/apache2/htdocs/frinex_restart_experient.log
echo "Restarting the application, please reload this page in a few minutes"