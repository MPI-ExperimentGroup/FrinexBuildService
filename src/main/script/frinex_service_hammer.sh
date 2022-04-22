#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server and will insert records into the DB
testUrls=$(sudo docker service ls \
    | grep -E "_staging" \
    | grep -E "_admin" \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' \
    | sed 's/->8080\/tcp//g' \
    | awk '{print "swarmNode1Url:" $6 "/" $2 "\nswarmNode2Url:" $6 "/" $2  "\nswarmNode3Url:" $6 "/" $2  "\nnginxProxiedUrl/" $2 "-admin\n"}' \
    | sed 's/_staging_admin-admin/-admin/g')

# echo $testUrls
echo "<table>"
for currentUrl in $testUrls
do
    echo "<tr><td>$currentUrl</td><td>"
    currentUserId="hammer_$(date +"%Y%m%d")"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"userId": "'$currentUserId'"}]' -H 'Content-Type: application/json' $currentUrl/metadata
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server"},{"viewDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "with_hammer_server_example","userId": "'$currentUserId'","screenName": "hammer_server"}]' -H 'Content-Type: application/json' $currentUrl/screenChange
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"}]' -H 'Content-Type: application/json' $currentUrl/tagEvent
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"}]' -H 'Content-Type: application/json' $currentUrl/tagPairEvent
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "With Stimuli Screen","eventMs": "6"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","eventTag": "hammer_server","eventMs": "2999"}]' -H 'Content-Type: application/json' $currentUrl/timeStamp
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k -d '[{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "3001"},{"tagDate" : "'$(date +"%Y-%m-%dT%H:%M:%S.000+0100")'","experimentName": "hammer_server","userId": "'$currentUserId'","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "6000"}]' -H 'Content-Type: application/json' $currentUrl/stimulusResponse
    echo "</td><td>"
    curl --write-out %{http_code} --connect-timeout 1 --max-time 2 --silent --output /dev/null -k --request POST -H "Content-Type:multipart/form-data" --form "userId=$currentUserId" --form "screenName=hammer_server" --form "stimulusId=hammer_server" --form "audioType=mp4" --form "downloadPermittedWindowMs=1000" --form "dataBlob=@/FrinexBuildService/test_data/100ms_v.mp4"  $currentUrl/audioBlob
    echo "</td></tr>"
done
echo "</table>"
