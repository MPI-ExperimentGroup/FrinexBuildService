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

date >> TargetDirectory/repository_setup.txt
echo $HTTP_REFERER >> TargetDirectory/repository_setup.txt
echo $REMOTE_USER >> TargetDirectory/repository_setup.txt

if [[ "$HTTP_REFERER" != *git_setup.html ]]
then
    echo "HTTP_REFERER not accepted: $HTTP_REFERER" >> TargetDirectory/repository_setup.txt
    echo "Service not available in this context."
else
    #echo "Repository Path: "
    tartegRepositoryName=$(echo $REMOTE_USER | sed 's/[^a-zA-Z0-9]/_/g')
    #echo $tartegRepositoryName.git
    #echo "<br/>"
    echo $tartegRepositoryName >> TargetDirectory/repository_setup.txt

    tartegRepositoryPath=$(echo $HTTP_REFERER | sed 's|/docs/git_setup.html$||g')

    if [ ${#tartegRepositoryName} -ge 6 ]
    then
        echo "Your build repository: <b>"
        echo "$tartegRepositoryPath/git/$tartegRepositoryName.git"
        echo "</b>"
        echo "$tartegRepositoryPath/git/$tartegRepositoryName.git" >> TargetDirectory/repository_setup.txt
        echo "<br/>"
        if [ -d RepositoriesDirectory/$tartegRepositoryName.git ];
        then
            #echo "your repository is ready for use";
            echo "target git repository already exists" >> TargetDirectory/repository_setup.txt
        else
            if [ -d CheckoutDirectory/$tartegRepositoryName ];
            then
                #echo CheckoutDirectory/$tartegRepositoryName
                echo "Error: target repository checkout already exists.";
                echo "target repository checkout already exists" >> TargetDirectory/repository_setup.txt
            else
                # initialise the repository
                echo "initialising" >> TargetDirectory/repository_setup.txt
                git init --bare RepositoriesDirectory/$tartegRepositoryName.git >> TargetDirectory/repository_setup.txt

                # adding post-receive hook
                echo "add the post-receive hook" >> TargetDirectory/repository_setup.txt
                sed "s/RepositoryName/$tartegRepositoryName/g" ScriptsDirectory/post-receive > RepositoriesDirectory/$tartegRepositoryName.git/hooks/post-receive

                # set permissions on the hooks
                chmod -R u+rwx RepositoriesDirectory/$tartegRepositoryName.git >> TargetDirectory/repository_setup.txt

                echo "Your repository is ready for use."
                echo "ready for use" >> TargetDirectory/repository_setup.txt
            fi
        fi
    else
        # if the tartegRepositoryName length is not at least 6 chars long then it could cause an issue so we abort here
        echo "There is an issue determining the build repository for this user (error -5)."
        echo "repository name is too short, aborting" >> TargetDirectory/repository_setup.txt
    fi
    echo "<br/>"
fi
# todo: perhaps an initial commit is nice for ease of use, but the repository can be cloned and used as is
