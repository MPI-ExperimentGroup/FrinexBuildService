#!/bin/bash
#
# Copyright (C) 2021 Max Planck Institute for Psycholinguistics
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
# @since 9 August 2021 8:27 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates a repository for authenticated user for use in the Frinex build process
# when commits are pushed to the resulting GIT repository any JSON and XML experiment 
# configuration files will offered to the build service

echo "Content-type: text/html"
echo ''
echo "<br/>"
# the experiment name will only contain lowercase, numbers and underscore so we remove any other characters to prevent unwanted behaviour
cleanedExperimentName=$(echo $QUERY_STRING | sed 's/[^a-z_0-9]/_/g')
echo "<!--$cleanedExperimentName-->";
echo "<b>"
# todo: add some informative messages to the user if no record is found
grep "\"$cleanedExperimentName\"" ProtectedDirectory/tokens.json | sed 's/[,]//g'
echo "</b>"
echo "<br/>"
