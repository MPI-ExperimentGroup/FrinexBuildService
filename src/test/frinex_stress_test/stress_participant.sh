#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
currentUrl="https://localhost:8443/ems06_stress_test-admin"
currentUserId="hammer_$(cat /proc/sys/kernel/random/uuid)"
echo "<tr><td>$currentUrl</td><td>$currentUserId</td><td>"
    # --connect-timeout 1 --max-time 2 

# frinexbq4_ParticipantsSeen_total.value 493
curl --write-out %{http_code} --silent --output /dev/null -k -H 'Accept-Language: es' -d '[{"userId": "'$currentUserId'"}]' -H 'Content-Type: application/json' $currentUrl/metadata
for i in {1..12}; do
    # screenChange
    # frinexbq4_screen_data_total.value 5970
    # 5970 / 493 = 12
    curl --silent --output /dev/null -k -d '[{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server"},{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "with_hammer_server_example","userId": "'$currentUserId'","screenName": "hammer_server"}]' -H 'Content-Type: application/json' $currentUrl/screenChange
done
for i in {1..23}; do
    # tagEvent
    # frinexbq4_tag_data_total.value 11799
    # 11799 / 493 = 23
    curl --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"}]' -H 'Content-Type: application/json' $currentUrl/tagEvent
done
for i in {1..168}; do
    # tagPairEvent
    # frinexbq4_tag_pair_data_total.value 83038
    # 83038 / 493 = 168
    curl --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"}]' -H 'Content-Type: application/json' $currentUrl/tagPairEvent
done
for i in {1..412}; do
    # timeStamp
    # frinexbq4_time_stamp_total.value 202988
    # 202988 / 493 = 412
    curl --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "With Stimuli Screen","eventMs": "6"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "hammer_server","eventMs": "2999"}]' -H 'Content-Type: application/json' $currentUrl/timeStamp
done
for i in {1..60}; do
    # stimulusResponse
    # frinexbq4_stimulus_response_total.value 29731
    # 29731 / 493 = 60
    curl --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server_'$(cat /proc/sys/kernel/random/uuid)'","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "3001"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server_'$(cat /proc/sys/kernel/random/uuid)'","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "6000"}]' -H 'Content-Type: application/json' $currentUrl/stimulusResponse
done
# for i in {1..100}; do
    # frinexbq4_media_data_total.value 78
    # 78 / 493
    # curl --silent --output /dev/null -k --request POST -H 'Accept-Language: es' -H "Content-Type:multipart/form-data" --form "userId=$currentUserId" --form "screenName=hammer_server" --form "stimulusId=hammer_server_'$(cat /proc/sys/kernel/random/uuid)'" --form "audioType=ogg" --form "downloadPermittedWindowMs=1000" --form "dataBlob=@/FrinexBuildService/test_data/100ms_a.ogg"  $currentUrl/audioBlob
# done
# frinexbq4_group_data_total.value 0
date
