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
# @since 11 May 2022 12:05 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This script runs frinex GWT builds with a range of settings to test the build speed

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

outputHtmlFile=/FrinexBuildService/artifacts/frinex_build_test_$(date +%F_%T).html
outputLogFile=/FrinexBuildService/artifacts/frinex_build_test_$(date +%F_%T).txt
# echo "<table border=1>" > $outputHtmlFile
# echo "<tr><td></td><td>1g</td><td>2g</td><td>4g</td><td>6g</td><td>8g</td></tr>" >> $outputHtmlFile
# for settingCPU in 1 2 4 6 8 10 12
# do
#     echo "<tr><td>$settingCPU CPU</td>" >> $outputHtmlFile
#     for settingRAM in 1g 2g 4g 6g 8g
#     do
#         echo "<td>" >> $outputHtmlFile
#         docker stop frinex_build_test_$settingCPU-$settingRAM
#         docker rm frinex_build_test_$settingCPU-$settingRAM
#         time (
#         sudo docker run --rm --cpus=$settingCPU --memory=$settingRAM --name frinex_build_test_$settingCPU-$settingRAM \
#         -v buildServerTarget:/FrinexBuildService/artifacts -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps:alpha \
#         /bin/bash -c "cd /ExperimentTemplate/gwt-cordova; mvn clean package -gs /maven/.m2/settings.xml -DskipTests \
#         -Dgwt.extraJvmArgs=\"-Xmx$settingRAM\" -Dgwt.localWorkers=$settingCPU \
#         "  >>$outputLogFile 2>>$outputLogFile ) 2>> $outputHtmlFile
#         echo "</td>" >> $outputHtmlFile
#     done
#     echo "</tr" >> $outputHtmlFile
# done
# echo "</table>"
# echo "<table border=1>" > $outputHtmlFile
# echo "<tr><td></td><td>8g Xmx1g</td><td>8g Xmx2g</td><td>8g Xmx4g</td><td>8g Xmx6g</td><td>8g Xmx8g</td></tr>" >> $outputHtmlFile
# for settingCPU in 1 2 4 6 8 10 12
# do
#     echo "<tr><td>12 CPU localWorkers=$settingCPU</td>" >> $outputHtmlFile
#     for settingRAM in 1g 2g 4g 6g 8g
#     do
#         echo "<td>" >> $outputHtmlFile
#         docker stop frinex_build_test_$settingCPU-$settingRAM
#         docker rm frinex_build_test_$settingCPU-$settingRAM
#         time (
#         sudo docker run --rm --cpus=12 --memory=8g --name frinex_build_test_$settingCPU-$settingRAM \
#         -v buildServerTarget:/FrinexBuildService/artifacts -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps:alpha \
#         /bin/bash -c "cd /ExperimentTemplate/gwt-cordova; mvn clean package -gs /maven/.m2/settings.xml -DskipTests \
#         -Dgwt.extraJvmArgs=\"-Xmx$settingRAM\" -Dgwt.localWorkers=$settingCPU \
#         "  >>$outputLogFile 2>>$outputLogFile ) 2>> $outputHtmlFile
#         echo "</td>" >> $outputHtmlFile
#     done
#     echo "</tr" >> $outputHtmlFile
# done
# echo "</table>"
# echo "<table border=1>" > $outputHtmlFile
# echo "<tr><td></td><td>12g -Xmx1g localWorkers=1</td><td>12g -Xmx1g localWorkers=2</td><td>12g -Xmx1g localWorkers=4</td><td>12g -Xmx1g localWorkers=6</td><td>12g -Xmx1g localWorkers=8</td><td>12g -Xmx1g localWorkers=10</td><td>12g -Xmx1g localWorkers=12</td></tr>" >> $outputHtmlFile
# for settingCPU in 4 6 8 10 12
# do
#     echo "<tr><td>$settingCPU CPU</td>" >> $outputHtmlFile
#     for settingWorkers in 1 2 4 6 8 10 12
#     do
#         echo "<td>" >> $outputHtmlFile
#         docker stop frinex_build_test_$settingCPU-$settingWorkers
#         docker rm frinex_build_test_$settingCPU-$settingWorkers
#         time (
#         sudo docker run --rm --cpus=$settingCPU --memory=12g --name frinex_build_test_$settingCPU-$settingWorkers \
#         -v buildServerTarget:/FrinexBuildService/artifacts -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps:alpha \
#         /bin/bash -c "cd /ExperimentTemplate/gwt-cordova; mvn clean package -gs /maven/.m2/settings.xml -DskipTests \
#         -Dgwt.localWorkers=$settingWorkers \
#         "  >>$outputLogFile 2>>$outputLogFile ) 2>> $outputHtmlFile
#         echo "</td>" >> $outputHtmlFile
#     done
#     echo "</tr" >> $outputHtmlFile
# done
# echo "</table>"
echo "<table border=1>" > $outputHtmlFile
echo "<tr>online_emotions<td></td><td>4g</td><td>6g</td><td>8g</td></tr>" >> $outputHtmlFile
for settingCPU in 8 10 12
do
    echo "<tr><td>$settingCPU CPU</td>" >> $outputHtmlFile
    for settingRAM in 4g 6g 8g
    do
        echo "<td>" >> $outputHtmlFile
        docker stop frinex_build_test_$settingCPU-$settingRAM
        docker rm frinex_build_test_$settingCPU-$settingRAM
        time (
        sudo docker run --rm --cpus=$settingCPU --memory=$settingRAM --name frinex_build_test_$settingCPU-$settingRAM \
        -v buildServerTarget:/FrinexBuildService/artifacts -v m2Directory:/maven/.m2/ -w /ExperimentTemplate frinexapps:alpha \
        /bin/bash -c "cd /ExperimentTemplate/gwt-cordova; mvn clean package -gs /maven/.m2/settings.xml -DskipTests \
        -Dexperiment.configuration.name=online_emotions \
        "  >>$outputLogFile 2>>$outputLogFile ) 2>> $outputHtmlFile
        echo "</td>" >> $outputHtmlFile
    done
    echo "</tr" >> $outputHtmlFile
done
echo "</table>"
