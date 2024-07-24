#!/bin/bash
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

# @since 22 July 20243 14:40 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>

# this script generates the commit files that would otherwise have been made by the post-receive commit hook
# these commit files are now used to determine if a commit would overwrite an experiment from a different repository

cd /FrinexBuildService/git-checkedout/;
for checkoutDirectory in /FrinexBuildService/git-checkedout/*/ ; do
    cd $checkoutDirectory; 
    pwd; 
    for experimentXml in *.xml ; do
        echo $experimentXml
        nameLowercase=$(echo $experimentXml | tr \"[:upper:]\" \"[:lower:]\" | sed -e "s/.xml//g")
        mkdir /FrinexBuildService/protected/$nameLowercase
        git log -1 --pretty='format:{"repository": "/git/'$nameLowercase'.git", "user": "%ce", "date": "%cI"}' $experimentXml > "/FrinexBuildService/protected/$nameLowercase/$nameLowercase.xml.commit";
        echo /FrinexBuildService/protected/$nameLowercase/$nameLowercase.xml.commit
        cat /FrinexBuildService/protected/$nameLowercase/$nameLowercase.xml.commit
    done
 done
