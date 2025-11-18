#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
currentUrl="https://localhost:8443/load_test_target-admin"
currentUserId="hammer_$(cat /proc/sys/kernel/random/uuid)"
echo "<tr><td>$currentUrl</td><td>$currentUserId</td><td>"
    # --connect-timeout 1 --max-time 2 

###################
# mpiprevalence_v2_DeploymentsAccessed.value 5
# mpiprevalence_v2_MediaResponses.value 0
# mpiprevalence_v2_PageLoads.value 82
# mpiprevalence_v2_ParticipantsSeen.value 75
# mpiprevalence_v2_StimulusResponses.value 6562
# mpiprevalence_v2_group_data.value 0
# mpiprevalence_v2_media_data.value 0
# mpiprevalence_v2_metadata.value 254
# mpiprevalence_v2_screen_data.value 508
# mpiprevalence_v2_stimulus_response.value 6567
# mpiprevalence_v2_tag_data.value 1262
# mpiprevalence_v2_tag_pair_data.value 6570
# mpiprevalence_v2_time_stamp.value 13216
###################

# frinexbq4_ParticipantsSeen_total.value 493
for i in {1..20}; do
    # RAN and Verbal fluency for one participant:
    # Participant: 20 rows
    # Participant: 16 rows
    curl --write-out "metadata:%{http_code}," --silent --show-error --output /dev/null -k -H 'Accept-Language: es' -d '[{"userId": "'$currentUserId'"}]' -H 'Content-Type: application/json' $currentUrl/metadata || echo "metadata:000,";
done
for i in {1..27}; do
    # RAN and Verbal fluency for one participant:
    # ScreenData: 27 rows
    # ScreenData: 14 rows

    # screenChange
    # frinexbq4_screen_data_total.value 5970
    # 5970 / 493 = 12
    # 508 / 75 = 7
    curl --write-out "screenChange:%{http_code}," --silent --show-error --output /dev/null -k -d '[{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server"},{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "with_hammer_server_example","userId": "'$currentUserId'","screenName": "hammer_server"}]' -H 'Content-Type: application/json' $currentUrl/screenChange || echo "screenChange:000,";
done
for i in {1..35}; do
    # RAN and Verbal fluency for one participant:
    # TagData: 35 rows
    # TagData: 27 rows

    # tagEvent
    # frinexbq4_tag_data_total.value 11799
    # 11799 / 493 = 23
    # 1262 / 75 = 17
    curl --write-out "tagEvent:%{http_code}," --silent --show-error --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"}]' -H 'Content-Type: application/json' $currentUrl/tagEvent || echo "tagEvent:000,";
done
for i in {1..25}; do
    # RAN and Verbal fluency for one participant:
    # TagPairData: 25 rows
    # TagPairData: 5 rows

    # tagPairEvent
    # frinexbq4_tag_pair_data_total.value 83038
    # 83038 / 493 = 168
    # 6570 / 75 = 88
    curl --write-out "tagPairEvent:%{http_code}," --silent --show-error --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"}]' -H 'Content-Type: application/json' $currentUrl/tagPairEvent || echo "tagPairEvent:000,";
done
for i in {1..276}; do
    # RAN and Verbal fluency for one participant:
    # TimeStamp: 276 rows
    # TimeStamp: 36 rows

    # timeStamp
    # frinexbq4_time_stamp_total.value 202988
    # 202988 / 493 = 412
    # 13216 / 75 = 177
    curl --write-out "timeStamp:%{http_code}," --silent --show-error --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "With Stimuli Screen","eventMs": "6"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "hammer_server","eventMs": "2999"}]' -H 'Content-Type: application/json' $currentUrl/timeStamp || echo "timeStamp:000,";
done
for i in {1..12}; do
    # RAN and Verbal fluency for one participant:
    # StimulusResponse: 12 rows
    # StimulusResponse: 4 rows

    # stimulusResponse
    # frinexbq4_stimulus_response_total.value 29731
    # 29731 / 493 = 60
    # 6567 / 75 = 88
    curl --write-out "stimulusResponse:%{http_code}," --silent --show-error --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server_'$(cat /proc/sys/kernel/random/uuid)'","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "3001"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server_'$(cat /proc/sys/kernel/random/uuid)'","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "6000"}]' -H 'Content-Type: application/json' $currentUrl/stimulusResponse || echo "stimulusResponse:000,";
done
# for i in {1..6000}; do # 100ms_a.ogg
for i in {1..60}; do # 60 X audioA-10s.wav = 10 minutes
    # RAN and Verbal fluency for one participant:
    # MediaData: 12 rows
    # MediaData: 4 rows
    # close to 10 minutes of recordings for each participant
    # Verbal fluency: 4 recordings per participant, 1 minute each == 4 minutes in total
    # RAN: 12 recordings per participant, about 20-30 seconds per trial == 4-6 minutes in total
    # Microphone test: 4 recordings per participant, about 2 seconds each == 8 seconds in total
    # 10 minutes / 100 ms = 6,000 copies of 100ms_a.ogg.

    # frinexbq4_media_data_total.value 78
    # 78 / 493
    curl --write-out "mediaBlob:%{http_code}," --silent --show-error --output /dev/null -k --request POST -H 'Accept-Language: es' -H "Content-Type:multipart/form-data" --form "userId=$currentUserId" --form "screenName=hammer_server" --form "stimulusId=hammer_server_'$(cat /proc/sys/kernel/random/uuid)'" --form "mediaType=ogg" --form "partNumber=0" --form "dataBlob=@/frinex_load_test/test_data/audio_10s.wav"  $currentUrl/mediaBlob || echo "mediaBlob:000,";
done
# frinexbq4_group_data_total.value 0
date
