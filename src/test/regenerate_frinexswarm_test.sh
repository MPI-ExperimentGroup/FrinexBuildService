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
#

#
# @since 17 September 2024 18:25 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

date >> frinexbuild_disk.log
df -h /var/lib/docker/ >> frinexbuild_disk.log
echo "install_frinexbuild_container" >> frinexbuild_disk.log
bash install_frinexbuild_container.sh

date >> frinexbuild_disk.log
df -h /var/lib/docker/ >> frinexbuild_disk.log
echo "generate_alpha_frinexapps" >> frinexbuild_disk.log
bash generate_alpha_frinexapps.sh

cd src/main/

# IFS=$'\n'
for compileDateString in "2024-08-13 16:57:27 +0200" "2024-07-08 11:52:07 +0200" "2024-06-27 17:16:45 +0200" "2024-05-23 11:33:15 +0200" "2024-05-07 15:28:27 +0200" "2024-04-04 16:22:40 +0200" "2024-03-13 16:13:08 +0100" "2024-02-26 14:32:35 +0100" "2023-09-06 12:08:08 +0200" "2023-08-15 15:50:21 +0200" "2023-08-14 14:43:35 +0200" "2023-05-25 17:37:07 +0200" "2023-05-16 15:30:14 +0200" "2023-04-25 14:57:45 +0200" "2023-04-18 14:54:51 +0200" "2023-04-05 14:32:23 +0200" "2023-03-20 15:08:28 +0100" "2023-03-08 14:20:50 +0100" "2023-02-27 12:16:19 +0100" "2023-02-01 16:25:52 +0100" "2022-11-24 16:27:40 +0100" "2022-11-23 16:58:47 +0100" "2022-11-22 16:02:30 +0100" "2022-11-18 08:35:44 +0100" "2022-05-02 16:48:08 +0200" "2022-04-14 16:30:03 +0200" "2021-10-18 16:35:53 +0200" "2021-09-29 16:38:10 +0200" "2021-09-07 16:45:32 +0200" "2021-08-31 10:54:26 +0200" "2021-08-20 16:08:26 +0200" "2021-08-12 15:17:06 +0200" "2021-07-08 14:20:18 +0200" "2021-06-18 15:51:36 +0200" "2021-05-04 11:10:31 +0200" "2021-04-28 15:49:04 +0200" "2021-04-20 09:52:45 +0200" "2021-03-15 15:58:24 +0100" "2021-03-11 16:31:55 +0100" "2021-03-10 14:06:00 +0100" "2021-02-17 14:15:20 +0100"
do
    compileDate=$(echo "$compileDateString" | sed "s/lastCommitDate:'//g" | sed "s/',//g")
    compileDateTag=$(echo "$compileDate" | sed "s/[^0-9]//g")
    echo $compileDate
    echo $compileDateTag

    date >> ../../frinexbuild_disk.log
    df -h /var/lib/docker/ >> ../../frinexbuild_disk.log
    echo "$compileDateTag" >> ../../frinexbuild_disk.log

    # build the compile date based version based on alpha:
    if docker build --no-cache --build-arg lastCommitDate="$compileDate" -f docker/rebuild-jdk-version.Dockerfile -t "frinexapps-jdk:$compileDateTag" . 
    then 
        # tag the compileDate version with its own build version
        compileDateVersion=$(docker run --rm -w /ExperimentTemplate/gwt-cordova "frinexapps-jdk:$compileDateTag" /bin/bash -c "cat /ExperimentTemplate/gwt-cordova.version")
        echo "taging as $compileDateVersion"
        docker tag "frinexapps-jdk:$compileDateTag" frinexapps-jdk:$compileDateVersion
        docker tag "frinexapps-cordova:alpha" frinexapps-cordova:$compileDateVersion
        docker tag "frinexapps-electron:alpha" frinexapps-electron:$compileDateVersion
    fi
done

date >> ../../frinexbuild_disk.log
df -h /var/lib/docker/ >> ../../frinexbuild_disk.log
echo "frinexbuild-wget" >> ../../frinexbuild_disk.log

docker run -v incomingDirectory:/FrinexBuildService/incoming --rm -it --name frinexbuild-wget frinexbuild:latest bash -c \
"mkdir /FrinexBuildService/incoming/commits/;\
cd /FrinexBuildService/incoming/commits/;\
wget http://frinexbuild.mpi.nl/addressee_memory-admin/addressee_memory-admin.xml;\
wget http://frinexbuild.mpi.nl/addressee_memory/addressee_memory.xml;\
wget http://frinexbuild.mpi.nl/aggressive_audio_ref-admin/aggressive_audio_ref-admin.xml;\
wget http://frinexbuild.mpi.nl/aggressive_audio_ref/aggressive_audio_ref.xml;\
wget http://frinexbuild.mpi.nl/aggressive_audio_test-admin/aggressive_audio_test-admin.xml;\
wget http://frinexbuild.mpi.nl/aggressive_audio_test/aggressive_audio_test.xml;\
wget http://frinexbuild.mpi.nl/assigned_value_example-admin/assigned_value_example-admin.xml;\
wget http://frinexbuild.mpi.nl/assigned_value_example/assigned_value_example.xml;\
wget http://frinexbuild.mpi.nl/audio_recorder_example-admin/audio_recorder_example-admin.xml;\
wget http://frinexbuild.mpi.nl/audio_recorder_example/audio_recorder_example.xml;\
wget http://frinexbuild.mpi.nl/auteurstest_separate-admin/auteurstest_separate-admin.xml;\
wget http://frinexbuild.mpi.nl/auteurstest_separate/auteurstest_separate.xml;\
wget http://frinexbuild.mpi.nl/digitspantest-admin/digitspantest-admin.xml;\
wget http://frinexbuild.mpi.nl/digitspantest/digitspantest.xml;\
wget http://frinexbuild.mpi.nl/ed_dog1_human1_r_2atrgzmcny4hubq-admin/ed_dog1_human1_r_2atrgzmcny4hubq-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_dog1_human1_r_2atrgzmcny4hubq/ed_dog1_human1_r_2atrgzmcny4hubq.xml;\
wget http://frinexbuild.mpi.nl/ed_dog1_human2_r_3jerivhkxcqjqor-admin/ed_dog1_human2_r_3jerivhkxcqjqor-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_dog1_human2_r_3jerivhkxcqjqor/ed_dog1_human2_r_3jerivhkxcqjqor.xml;\
wget http://frinexbuild.mpi.nl/ed_dog2_human2_r_2yb4ykf7hywe31s-admin/ed_dog2_human2_r_2yb4ykf7hywe31s-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_dog2_human2_r_2yb4ykf7hywe31s/ed_dog2_human2_r_2yb4ykf7hywe31s.xml;\
wget http://frinexbuild.mpi.nl/ed_human1_dog1_r_1jtanttjf5bw8qw-admin/ed_human1_dog1_r_1jtanttjf5bw8qw-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_human1_dog1_r_1jtanttjf5bw8qw/ed_human1_dog1_r_1jtanttjf5bw8qw.xml;\
wget http://frinexbuild.mpi.nl/ed_human2_dog2_r_3i4afkxvondatcv-admin/ed_human2_dog2_r_3i4afkxvondatcv-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_human2_dog2_r_3i4afkxvondatcv/ed_human2_dog2_r_3i4afkxvondatcv.xml;\
wget http://frinexbuild.mpi.nl/ed_human2_dog2_r_an7elf1xgpa8rlp-admin/ed_human2_dog2_r_an7elf1xgpa8rlp-admin.xml;\
wget http://frinexbuild.mpi.nl/ed_human2_dog2_r_an7elf1xgpa8rlp/ed_human2_dog2_r_an7elf1xgpa8rlp.xml;\
wget http://frinexbuild.mpi.nl/electron_wrapper_test-admin/electron_wrapper_test-admin.xml;\
wget http://frinexbuild.mpi.nl/electron_wrapper_test/electron_wrapper_test.xml;\
wget http://frinexbuild.mpi.nl/fn_dutch_all-admin/fn_dutch_all-admin.xml;\
wget http://frinexbuild.mpi.nl/fn_dutch_all/fn_dutch_all.xml;\
wget http://frinexbuild.mpi.nl/fn_ukrainian-admin/fn_ukrainian-admin.xml;\
wget http://frinexbuild.mpi.nl/fn_ukrainian/fn_ukrainian.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice1a-admin/forcedchoice1a-admin.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice1a/forcedchoice1a.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice1b-admin/forcedchoice1b-admin.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice1b/forcedchoice1b.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice2a-admin/forcedchoice2a-admin.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice2a/forcedchoice2a.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice4a-admin/forcedchoice4a-admin.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice4a/forcedchoice4a.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice-admin/forcedchoice-admin.xml;\
wget http://frinexbuild.mpi.nl/forcedchoice/forcedchoice.xml;\
wget http://frinexbuild.mpi.nl/framerate_timer_example-admin/framerate_timer_example-admin.xml;\
wget http://frinexbuild.mpi.nl/framerate_timer_example/framerate_timer_example.xml;\
wget http://frinexbuild.mpi.nl/french_audio_example-admin/french_audio_example-admin.xml;\
wget http://frinexbuild.mpi.nl/french_audio_example/french_audio_example.xml;\
wget http://frinexbuild.mpi.nl/frinexmanualsurvey-admin/frinexmanualsurvey-admin.xml;\
wget http://frinexbuild.mpi.nl/frinexmanualsurvey/frinexmanualsurvey.xml;\
wget http://frinexbuild.mpi.nl/group_streaming_example-admin/group_streaming_example-admin.xml;\
wget http://frinexbuild.mpi.nl/group_streaming_example/group_streaming_example.xml;\
wget http://frinexbuild.mpi.nl/group_webcam_example-admin/group_webcam_example-admin.xml;\
wget http://frinexbuild.mpi.nl/group_webcam_example/group_webcam_example.xml;\
wget http://frinexbuild.mpi.nl/idlas_en_pilot_electron-admin/idlas_en_pilot_electron-admin.xml;\
wget http://frinexbuild.mpi.nl/idlas_en_pilot_electron/idlas_en_pilot_electron.xml;\
wget http://frinexbuild.mpi.nl/idlas_se_pilot_electron-admin/idlas_se_pilot_electron-admin.xml;\
wget http://frinexbuild.mpi.nl/idlas_se_pilot_electron/idlas_se_pilot_electron.xml;\
wget http://frinexbuild.mpi.nl/idlasdeauditorychoicereactiontime-admin/idlasdeauditorychoicereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasdeauditorychoicereactiontime/idlasdeauditorychoicereactiontime.xml;\
wget http://frinexbuild.mpi.nl/idlasdeauditorysimplereactiontime-admin/idlasdeauditorysimplereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasdeauditorysimplereactiontime/idlasdeauditorysimplereactiontime.xml;\
wget http://frinexbuild.mpi.nl/idlasdelandingpage-admin/idlasdelandingpage-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasdelandingpage/idlasdelandingpage.xml;\
wget http://frinexbuild.mpi.nl/idlasenregistration-admin/idlasenregistration-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasenregistration/idlasenregistration.xml;\
wget http://frinexbuild.mpi.nl/idlasseerrorhandler-admin/idlasseerrorhandler-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasseerrorhandler/idlasseerrorhandler.xml;\
wget http://frinexbuild.mpi.nl/idlasselandingpage-admin/idlasselandingpage-admin.xml;\
wget http://frinexbuild.mpi.nl/idlasselandingpage/idlasselandingpage.xml;\
wget http://frinexbuild.mpi.nl/lettercom-admin/lettercom-admin.xml;\
wget http://frinexbuild.mpi.nl/lettercom/lettercom.xml;\
wget http://frinexbuild.mpi.nl/local_storage_full-admin/local_storage_full-admin.xml;\
wget http://frinexbuild.mpi.nl/local_storage_full/local_storage_full.xml;\
wget http://frinexbuild.mpi.nl/mainexp_baseline_naming_task_list4-admin/mainexp_baseline_naming_task_list4-admin.xml;\
wget http://frinexbuild.mpi.nl/mainexp_baseline_naming_task_list4/mainexp_baseline_naming_task_list4.xml;\
wget http://frinexbuild.mpi.nl/mpideauditorychoicereactiontime-admin/mpideauditorychoicereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/mpideauditorychoicereactiontime/mpideauditorychoicereactiontime.xml;\
wget http://frinexbuild.mpi.nl/mpidecorsiblock-admin/mpidecorsiblock-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidecorsiblock/mpidecorsiblock.xml;\
wget http://frinexbuild.mpi.nl/mpidegrammaticalgendercues2-admin/mpidegrammaticalgendercues2-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidegrammaticalgendercues2/mpidegrammaticalgendercues2.xml;\
wget http://frinexbuild.mpi.nl/mpideidiomrecognition-admin/mpideidiomrecognition-admin.xml;\
wget http://frinexbuild.mpi.nl/mpideidiomrecognition/mpideidiomrecognition.xml;\
wget http://frinexbuild.mpi.nl/mpideprescriptivegrammar-admin/mpideprescriptivegrammar-admin.xml;\
wget http://frinexbuild.mpi.nl/mpideprescriptivegrammar/mpideprescriptivegrammar.xml;\
wget http://frinexbuild.mpi.nl/mpidequestionsdemographic-admin/mpidequestionsdemographic-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidequestionsdemographic/mpidequestionsdemographic.xml;\
wget http://frinexbuild.mpi.nl/mpidequestionsdemographics-admin/mpidequestionsdemographics-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidequestionsdemographics/mpidequestionsdemographics.xml;\
wget http://frinexbuild.mpi.nl/mpidesentencecomprehension1-admin/mpidesentencecomprehension1-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidesentencecomprehension1/mpidesentencecomprehension1.xml;\
wget http://frinexbuild.mpi.nl/mpidesessionend-admin/mpidesessionend-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidesessionend/mpidesessionend.xml;\
wget http://frinexbuild.mpi.nl/mpidevisualchoicereactiontime-admin/mpidevisualchoicereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/mpidevisualchoicereactiontime/mpidevisualchoicereactiontime.xml;\
wget http://frinexbuild.mpi.nl/mpienauditorychoicereactiontime-admin/mpienauditorychoicereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienauditorychoicereactiontime/mpienauditorychoicereactiontime.xml;\
wget http://frinexbuild.mpi.nl/mpienauthorrecognition-admin/mpienauthorrecognition-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienauthorrecognition/mpienauthorrecognition.xml;\
wget http://frinexbuild.mpi.nl/mpienfastreadlisten-admin/mpienfastreadlisten-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienfastreadlisten/mpienfastreadlisten.xml;\
wget http://frinexbuild.mpi.nl/mpienmaximalspeechrate-admin/mpienmaximalspeechrate-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienmaximalspeechrate/mpienmaximalspeechrate.xml;\
wget http://frinexbuild.mpi.nl/mpienreadingspan-admin/mpienreadingspan-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienreadingspan/mpienreadingspan.xml;\
wget http://frinexbuild.mpi.nl/mpienspellingtest-admin/mpienspellingtest-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienspellingtest/mpienspellingtest.xml;\
wget http://frinexbuild.mpi.nl/mpienstuvoc-admin/mpienstuvoc-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienstuvoc/mpienstuvoc.xml;\
wget http://frinexbuild.mpi.nl/mpienverbalfluency-admin/mpienverbalfluency-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienverbalfluency/mpienverbalfluency.xml;\
wget http://frinexbuild.mpi.nl/mpienvisualsimplereactiontime-admin/mpienvisualsimplereactiontime-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienvisualsimplereactiontime/mpienvisualsimplereactiontime.xml;\
wget http://frinexbuild.mpi.nl/mpienwordstogether-admin/mpienwordstogether-admin.xml;\
wget http://frinexbuild.mpi.nl/mpienwordstogether/mpienwordstogether.xml;\
wget http://frinexbuild.mpi.nl/network_description_task-admin/network_description_task-admin.xml;\
wget http://frinexbuild.mpi.nl/network_description_task/network_description_task.xml;\
wget http://frinexbuild.mpi.nl/prescreentest-admin/prescreentest-admin.xml;\
wget http://frinexbuild.mpi.nl/prescreentest/prescreentest.xml;\
wget http://frinexbuild.mpi.nl/prosody_2_2-admin/prosody_2_2-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_2_2/prosody_2_2.xml;\
wget http://frinexbuild.mpi.nl/prosody_5_1-admin/prosody_5_1-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_5_1/prosody_5_1.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_1-admin/prosody_exp2_1-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_1/prosody_exp2_1.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_2-admin/prosody_exp2_2-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_2/prosody_exp2_2.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_3-admin/prosody_exp2_3-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_3/prosody_exp2_3.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_4-admin/prosody_exp2_4-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_4/prosody_exp2_4.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_5-admin/prosody_exp2_5-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_5/prosody_exp2_5.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_6-admin/prosody_exp2_6-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_6/prosody_exp2_6.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_7-admin/prosody_exp2_7-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_7/prosody_exp2_7.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_8-admin/prosody_exp2_8-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_8/prosody_exp2_8.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_9-admin/prosody_exp2_9-admin.xml;\
wget http://frinexbuild.mpi.nl/prosody_exp2_9/prosody_exp2_9.xml;\
wget http://frinexbuild.mpi.nl/q_test-admin/q_test-admin.xml;\
wget http://frinexbuild.mpi.nl/q_test/q_test.xml;\
wget http://frinexbuild.mpi.nl/questionnaire_example-admin/questionnaire_example-admin.xml;\
wget http://frinexbuild.mpi.nl/questionnaire_example/questionnaire_example.xml;\
wget http://frinexbuild.mpi.nl/recorder_level_trigger_example-admin/recorder_level_trigger_example-admin.xml;\
wget http://frinexbuild.mpi.nl/recorder_level_trigger_example/recorder_level_trigger_example.xml;\
wget http://frinexbuild.mpi.nl/s1prescreense-admin/s1prescreense-admin.xml;\
wget http://frinexbuild.mpi.nl/s1prescreense/s1prescreense.xml;\
wget http://frinexbuild.mpi.nl/s2bfi10de-admin/s2bfi10de-admin.xml;\
wget http://frinexbuild.mpi.nl/s2bfi10de/s2bfi10de.xml;\
wget http://frinexbuild.mpi.nl/s3auditorychoicereactiontimese-admin/s3auditorychoicereactiontimese-admin.xml;\
wget http://frinexbuild.mpi.nl/s3auditorychoicereactiontimese/s3auditorychoicereactiontimese.xml;\
wget http://frinexbuild.mpi.nl/s3auditorysimplereactiontimese-admin/s3auditorysimplereactiontimese-admin.xml;\
wget http://frinexbuild.mpi.nl/s3auditorysimplereactiontimese/s3auditorysimplereactiontimese.xml;\
wget http://frinexbuild.mpi.nl/s3grammaticalgendercues1se-admin/s3grammaticalgendercues1se-admin.xml;\
wget http://frinexbuild.mpi.nl/s3grammaticalgendercues1se/s3grammaticalgendercues1se.xml;\
wget http://frinexbuild.mpi.nl/s3grammaticalgendercues2se-admin/s3grammaticalgendercues2se-admin.xml;\
wget http://frinexbuild.mpi.nl/s3grammaticalgendercues2se/s3grammaticalgendercues2se.xml;\
wget http://frinexbuild.mpi.nl/s3phrasegenerationse-admin/s3phrasegenerationse-admin.xml;\
wget http://frinexbuild.mpi.nl/s3phrasegenerationse/s3phrasegenerationse.xml;\
wget http://frinexbuild.mpi.nl/s3sentencegenerationse-admin/s3sentencegenerationse-admin.xml;\
wget http://frinexbuild.mpi.nl/s3sentencegenerationse/s3sentencegenerationse.xml;\
wget http://frinexbuild.mpi.nl/s4audiotestse-admin/s4audiotestse-admin.xml;\
wget http://frinexbuild.mpi.nl/s4audiotestse/s4audiotestse.xml;\
wget http://frinexbuild.mpi.nl/s4questionnairehealthse-admin/s4questionnairehealthse-admin.xml;\
wget http://frinexbuild.mpi.nl/s4questionnairehealthse/s4questionnairehealthse.xml;\
wget http://frinexbuild.mpi.nl/s4rapidautomatizednamingde-admin/s4rapidautomatizednamingde-admin.xml;\
wget http://frinexbuild.mpi.nl/s4rapidautomatizednamingde/s4rapidautomatizednamingde.xml;\
wget http://frinexbuild.mpi.nl/s4rapidautomatizednamingse-admin/s4rapidautomatizednamingse-admin.xml;\
wget http://frinexbuild.mpi.nl/s4rapidautomatizednamingse/s4rapidautomatizednamingse.xml;\
wget http://frinexbuild.mpi.nl/s4verbalfluencyse-admin/s4verbalfluencyse-admin.xml;\
wget http://frinexbuild.mpi.nl/s4verbalfluencyse/s4verbalfluencyse.xml;\
wget http://frinexbuild.mpi.nl/secondlan1-admin/secondlan1-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan1/secondlan1.xml;\
wget http://frinexbuild.mpi.nl/secondlan2-admin/secondlan2-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan2/secondlan2.xml;\
wget http://frinexbuild.mpi.nl/secondlan3-admin/secondlan3-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan3/secondlan3.xml;\
wget http://frinexbuild.mpi.nl/secondlan4-admin/secondlan4-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan4/secondlan4.xml;\
wget http://frinexbuild.mpi.nl/secondlan5-admin/secondlan5-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan5/secondlan5.xml;\
wget http://frinexbuild.mpi.nl/secondlan6-admin/secondlan6-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan6/secondlan6.xml;\
wget http://frinexbuild.mpi.nl/secondlan-admin/secondlan-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan/secondlan.xml;\
wget http://frinexbuild.mpi.nl/secondlan_test-admin/secondlan_test-admin.xml;\
wget http://frinexbuild.mpi.nl/secondlan_test/secondlan_test.xml;\
wget http://frinexbuild.mpi.nl/sound_onset_example-admin/sound_onset_example-admin.xml;\
wget http://frinexbuild.mpi.nl/sound_onset_example/sound_onset_example.xml;\
wget http://frinexbuild.mpi.nl/stimulus_timer_example-admin/stimulus_timer_example-admin.xml;\
wget http://frinexbuild.mpi.nl/stimulus_timer_example/stimulus_timer_example.xml;\
wget http://frinexbuild.mpi.nl/temple_test-admin/temple_test-admin.xml;\
wget http://frinexbuild.mpi.nl/temple_test/temple_test.xml;\
wget http://frinexbuild.mpi.nl/thijs_test_2-admin/thijs_test_2-admin.xml;\
wget http://frinexbuild.mpi.nl/thijs_test_2/thijs_test_2.xml;\
wget http://frinexbuild.mpi.nl/thijs_test_3-admin/thijs_test_3-admin.xml;\
wget http://frinexbuild.mpi.nl/thijs_test_3/thijs_test_3.xml;\
wget http://frinexbuild.mpi.nl/thijs_test-admin/thijs_test-admin.xml;\
wget http://frinexbuild.mpi.nl/thijs_test/thijs_test.xml;\
wget http://frinexbuild.mpi.nl/timer_averaging_example-admin/timer_averaging_example-admin.xml;\
wget http://frinexbuild.mpi.nl/timer_averaging_example/timer_averaging_example.xml;\
wget http://frinexbuild.mpi.nl/translation_example-admin/translation_example-admin.xml;\
wget http://frinexbuild.mpi.nl/translation_example/translation_example.xml;\
wget http://frinexbuild.mpi.nl/uppercasetest-admin/uppercasetest-admin.xml;\
wget http://frinexbuild.mpi.nl/uppercasetest/uppercasetest.xml;\
wget http://frinexbuild.mpi.nl/very_large_example-admin/very_large_example-admin.xml;\
wget http://frinexbuild.mpi.nl/very_large_example/very_large_example.xml;\
wget http://frinexbuild.mpi.nl/with_stimulus_example-admin/with_stimulus_example-admin.xml;\
wget http://frinexbuild.mpi.nl/with_stimulus_example/with_stimulus_example.xml;\
wget http://frinexbuild.mpi.nl/wmx_l2pros_test-admin/wmx_l2pros_test-admin.xml;\
wget http://frinexbuild.mpi.nl/wmx_l2pros_test/wmx_l2pros_test.xml;"

# the following step will require authentication
curl http://localhost/cgi/request_build.cgi
