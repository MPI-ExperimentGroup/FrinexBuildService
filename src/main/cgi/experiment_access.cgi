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
# the experiment name will only contain lowercase, numbers, and underscores
cleanedExperimentName=$(echo $QUERY_STRING | sed 's/[^a-z_0-9]/_/g')
echo "<!--$cleanedExperimentName-->";
echo "<b>"
# List of allowed users
allowedUsers=("one@example.com" "two@example.com" "three@example.com")

# Check if the current user is allowed
userAllowed=false
for user in "${allowedUsers[@]}"; do
    if [ "${REMOTE_USER,,}" = "${user,,}" ]; then
        userAllowed=true
        break
    fi
done

if [ "$userAllowed" = true ]; then
    # Display matching records
    grep "\"$cleanedExperimentName\"" ProtectedDirectory/tokens.json | sed 's/[,]//g'
else
    # Join all allowed users into a comma-separated string for display
    contactList=$(IFS=, ; echo "${allowedUsers[*]}")
    echo "Please contact one of the following users for access: $contactList"
fi
echo "</b>"
echo "<br/>"
