#!/bin/bash
#
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
#

#
# @since 13 June 2022 09:44 AM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script iterates all -admin.war and -admin.war.disabled files and updates the properties files with the new DB URL

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

# find all admin war files 
for foundPath in /srv/tomcat/webapps/*-admin.war*
do
    tempPath=$foundPath.temp
    backupPath=$foundPath.backup
    # restore the backup if it exists
    mv $backupPath $foundPath
    # make a temp file to modify
    cp $foundPath $tempPath
    echo $tempPath;
    # print out the original values
    unzip -p $foundPath WEB-INF/classes/application.properties

    unzip $tempPath WEB-INF/classes/application.properties -d .
    # replace the values
    sed -i "s/localhost/updatedhost/g" WEB-INF/classes/application.properties
    zip $tempPath WEB-INF/classes/application.properties
    # clean up files
    rm WEB-INF/classes/application.properties

    # print out the updated values
    unzip -p $tempPath WEB-INF/classes/application.properties

    # move the original to use as the backup
    mv $foundPath $backupPath
    # use the temp file to replace the original
    mv $tempPath $foundPath
done
