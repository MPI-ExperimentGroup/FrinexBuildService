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
# @since 13 April2021 15:22 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates a repository for authenticated user for use in the Frinex build process
# when commits are pushed to the resulting GIT repository any JSON and XML experiment 
# configuration files will offered to the build service

echo "Content-type: text/html"
echo ''
#if [[ "$REMOTE_USER" == *mpi.nl ]]
#then
#        echo "ends with mpi"
#else
#        echo "mpi not found"
#        exit 0
#fi
#echo "<br/>"

#echo "Repository Path: "
tartegRepositoryName=$(echo $REMOTE_USER | sed 's/[^a-zA-Z0-9]/_/g')
#echo $tartegRepositoryName.git
#echo "<br/>"

if [ ${#tartegRepositoryName} -ge 6 ]
then
    echo "Your build repository: "
    echo HTTP_HOST
    echo SERVER_PROTOCOL
    echo SERVER_NAME
    echo SERVER_PORT
    echo "/git/$tartegRepositoryName.git"
    echo "<br/>"
    if [ -d RepositoriesDirectory/$tartegRepositoryName.git ];
    then
        echo "target git repository already exists";
    else
        if [ -d CheckoutDirectory/$tartegRepositoryName ];
        then
            #echo CheckoutDirectory/$tartegRepositoryName
            echo "target repository checkout already exists";
        else
            # initialise the repository
            git init --bare RepositoriesDirectory/$tartegRepositoryName.git

            # add the post-receive hook
            sed "s/RepositoryName/$tartegRepositoryName/g" ScriptsDirectory/post-receive > RepositoriesDirectory/$tartegRepositoryName.git/hooks/post-receive
        fi
    fi
else
    # if the tartegRepositoryName length is not at least 6 chars long then it could cause an issue so we abort here
    echo "There is an issue determining the build repository for this user (error -5)."
fi
echo "<br/>"

# todo: perhaps an initial commit is require for ease of use

echo "<br/>"
echo "done"
echo "<br/>"