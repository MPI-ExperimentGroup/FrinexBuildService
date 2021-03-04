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
# @since 04 March 2021 11:29 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script updates the post-receive hooks in all existing repositories with the latest version in this directory

cd $(dirname "$0")
scriptDir=$(pwd -P)

for repositoryPath in RepositoriesDirectory/*.git ; do
    echo $repositoryPath;
    repositoryDir=$(basename $repositoryPath);
    echo $repositoryDir;
    repositoryName=${repositoryDir%.git}
    echo $repositoryName;
    cp $repositoryPath/hooks/post-receive $repositoryPath/hooks/post-receive.old
    sed "s/RepositoryName/$repositoryName/g" $scriptDir/post-receive > $repositoryPath/hooks/post-receive
    diff $repositoryPath/hooks/post-receive.old $repositoryPath/hooks/post-receive
done
