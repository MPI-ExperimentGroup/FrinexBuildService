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

#echo "Repository Path: "
targetRepositoryName=$(echo $REMOTE_USER | sed 's/[^a-zA-Z0-9]/_/g')
#echo $targetRepositoryName.git
#echo "<br/>"
echo $targetRepositoryName >> TargetDirectory/repository_setup.txt

if [ ${#targetRepositoryName} -ge 6 ]
then
    echo "Your build repository is located at: <b>"
    echo "BuildServerUrl/git/$targetRepositoryName.git"
    echo "</b>"
    echo "BuildServerUrl/git/$targetRepositoryName.git" >> TargetDirectory/repository_setup.txt
    echo "<br/>"
    if [ -d RepositoriesDirectory/$targetRepositoryName.git ];
    then
        #echo "your repository is ready for use";
        echo "target git repository already exists" >> TargetDirectory/repository_setup.txt
    else
        if [ -d CheckoutDirectory/$targetRepositoryName ];
        then
            #echo CheckoutDirectory/$targetRepositoryName
            echo "Error: target repository checkout already exists.";
            echo "target repository checkout already exists" >> TargetDirectory/repository_setup.txt
        else
            # initialise the repository
            echo "initialising" >> TargetDirectory/repository_setup.txt
            git init --bare RepositoriesDirectory/$targetRepositoryName.git >> TargetDirectory/repository_setup.txt

            # adding post-receive hook
            echo "add the post-receive hook" >> TargetDirectory/repository_setup.txt
            sed "s/RepositoryName/$targetRepositoryName/g" ScriptsDirectory/post-receive > RepositoriesDirectory/$targetRepositoryName.git/hooks/post-receive

            # set permissions on the hooks
            chmod -R u+rwx RepositoriesDirectory/$targetRepositoryName.git >> TargetDirectory/repository_setup.txt

            # checkout a copy
            cd CheckoutDirectory
            git clone RepositoriesDirectory/$targetRepositoryName.git >> TargetDirectory/repository_setup.txt

            # add a readme file, commit and push
            # this initial commit is nice for ease of the end user, while the repository can be cloned without it there can also be issues with the naming of the default branch depending on the client used
            cd $targetRepositoryName
            git config user.email "frinexbuild@BuildServerUrl" >> TargetDirectory/repository_setup.txt
            git config user.name "FrinexBuildServer" >> TargetDirectory/repository_setup.txt
            git config pull.rebase true >> TargetDirectory/repository_setup.txt
            date > CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "This repository can be used to push experiments to the Frinex build server." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "When experiment configuration files are committed and pushed the build process will begin." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "The build process can be followed at BuildServerUrl." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "When the experiment has stimuli files that should be included, they can be commited into a directory of the same name as the experiment configuration fle." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "When a mobile or desktop app is required, an icon.png file should be included in directory of the same name as the experiment configuration fle." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "For information on Frinex XML features see BuildServerUrl/frinex.html." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            echo "The XML schema file BuildServerUrl/frinex.html should be declaired in the relevant section of your XML files." >> CheckoutDirectory/$targetRepositoryName/readme.txt
            git add readme.txt >> TargetDirectory/repository_setup.txt
            # commit and push the readme.txt
            git commit -m "Adding a readme file to initialise this repository." readme.txt  >> TargetDirectory/repository_setup.txt
            git push >> TargetDirectory/repository_setup.txt
            # set up fast forward by default
            git config pull.ff only >> TargetDirectory/repository_setup.txt
            
            echo "Your repository is ready for use."
            echo "ready for use" >> TargetDirectory/repository_setup.txt
        fi
    fi
else
    # if the targetRepositoryName length is not at least 6 chars long then it could cause an issue so we abort here
    echo "There is an issue determining the build repository for this user (error -5)."
    echo "repository name is too short, aborting" >> TargetDirectory/repository_setup.txt
fi
echo "<br/>"
