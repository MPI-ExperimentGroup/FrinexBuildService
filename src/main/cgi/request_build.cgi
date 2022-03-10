#!/bin/bash

# Copyright (C) 2022 Max Planck Institute for Psycholinguistics
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

# @since 31 Jan 202 11:52 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

cd $(dirname "$0")
scriptDir=ScriptsDirectory
targetDir=TargetDirectory

# this script checks if there is a running build process and if there is none then the build process will be started
# the build process will exit when it has processed all the relevant files in incoming

echo "Content-type: text/html"
echo ''

if [ -z "$(ls -A $scriptDir/incoming/commits/)" ]; then
   echo "no commits found<br/>"
else
  chmod -R a+rw $scriptDir/incoming/commits/*
fi

if [ -z "$(ls -A $scriptDir/incoming/static/)" ]; then
   echo "no static files<br/>"
else
  chmod -R a+rw $scriptDir/incoming/static/*
fi


if [ "$(pidof node-default)" ]
then
  pidof node-default
  echo "build in process, exiting<br/>";
elif [ "$(pidof node)" ]
then
  pidof node
  echo "build in process, exiting<br/>";
else
  echo "starting build process<br/>";
  nohup nice sudo -u frinex node --use_strict $scriptDir/deploy-by-hook.js >> $targetDir/git-push-out.txt 2>> $targetDir/git-push-err.txt &
  pidof node-default
  pidof node
fi
echo "<a href=\"/\">reload listing</a><br/>";
