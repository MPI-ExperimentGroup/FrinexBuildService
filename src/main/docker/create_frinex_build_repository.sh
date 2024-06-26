#!/bin/bash
#
# Copyright (C) 2018 Max Planck Institute for Psycholinguistics
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
# @since September 13, 2018 11:41 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script creates a separated repository for use in the Frinex build process
# when commits are pushed to the resulting GIT repository any JSON and XML experiment configuration files will be built according to the rules in listing.json
cd $(dirname "$0")
scriptDir=$(pwd -P)

if [[ $# -eq 0 ]] ; then
    echo 'please provide the target repository name as the first argument'
    exit 0
fi

echo RepositoriesDirectory/$1.git
if [ -d RepositoriesDirectory/$1.git ];
then
    echo "target git repository already exists";
    exit 0
fi

echo CheckoutDirectory/$1
if [ -d CheckoutDirectory/$1 ];
then
    echo "target repository checkout already exists";
    exit 0
fi

# initialise the repository
git init --bare RepositoriesDirectory/$1.git

# add the repository to the list of conflict check locations
# todo: un-macify this
sed -i'.tmp' -e "s/listingJsonFiles\ =\ /listingJsonFiles\ =\ \.\.\/$1\/listing\.json\,/g" $scriptDir/publish.properties

# add the post-receive hook
#cp /srv/ExperimentTemplate/post-receive /srv/git/$1.git/hooks/post-receive
sed "s/RepositoryName/$1/g" $scriptDir/post-receive > RepositoriesDirectory/$1.git/hooks/post-receive
#sed -i "s/maarten/$1/g" /srv/git/$1.git/hooks/post-receive
#diff /srv/git/maarten.git/hooks/post-receive /srv/git/$1.git/hooks/post-receive

# set the permissions
chmod -R g+rwx RepositoriesDirectory/$1.git
chmod -R u+rwx RepositoriesDirectory/$1.git
#chown -R wwwrun /srv/git/$1.git

# add the git user
#htpasswd /srv/git/.htpasswd $1

# check out the repository for use in the build process
#cd /srv; git clone git/$1.git

# set the permissions
#chmod -R g+rwx /srv/$1
#chmod -R u+rwx /srv/$1
#chown -R wwwrun /srv/$1



cd CheckoutDirectory
git clone RepositoriesDirectory/$1.git

# make sure the new repository is accessable by httpd
# chown -R daemon RepositoriesDirectory/$1.git
chown -R www-data:daemon RepositoriesDirectory/$1.git
# chown -R daemon CheckoutDirectory/$1
chown -R www-data:daemon CheckoutDirectory/$1
