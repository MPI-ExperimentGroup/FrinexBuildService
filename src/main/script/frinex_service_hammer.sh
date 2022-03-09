#!/bin/bash

# do not run this on a machine that is in use, this script is designed to cause load on the server

testUrls=$(sudo docker service ls \
    | grep -E "_staging" \
    | grep -E "_admin" \
    | grep -E "8080/tcp" \
    | sed 's/[*:]//g' \
    | sed 's/->8080\/tcp//g' \
    | awk '{print "http://swarmNode1Url:" $6 "\nhttp://swarmNode2Url:" $6 "\nhttp://swarmNode3Url:" $6 "\nhttps://nginxProxiedUrl/" $2 "\n"}' \
    | sed 's/_staging_admin/-admin/g')

echo $testUrls

for currentUrl in $testUrls
do
    echo $currentUrl
    curl -d '[{"viewDate" : "2020-02-11T11:50:57.458+0100","experimentName": "hammer_server","userId": "17033df9c23-7339-62bf-6f73-eb92","screenName": "hammer_server"},{"viewDate" : "2020-02-11T11:50:57.468+0100","experimentName": "with_hammer_server_example","userId": "17033df9c23-7339-62bf-6f73-eb92","screenName": "hammer_server"}]' -H 'Content-Type: application/json' $currentUrl/screenChange
    curl -d '[{"tagDate" : "2020-02-11T11:50:57.461+0100","experimentName": "hammer_server","userId": "17033df9c23-7339-62bf-6f73-eb92","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"},{"tagDate" : "2020-02-11T11:51:00.197+0100","experimentName": "hammer_server","userId": "17033df9c23-7339-62bf-6f73-eb92","screenName": "hammer_server","eventTag": "hammer_server","tagValue": "hammer_server","eventMs": "0"}]' -H 'Content-Type: application/json' $currentUrl/tagEvent
    curl -d '[{"tagDate" : "2020-02-11T14:25:09.143+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"},{"tagDate" : "2020-02-11T14:25:09.143+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","screenName": "hammer_server","dataChannel": 0,"eventTag": "hammer_server","tagValue1": "hammer_server","tagValue2": "hammer_server","eventMs": "8999"}]' -H 'Content-Type: application/json' $currentUrl/tagPairEvent
    curl -d '[{"tagDate" : "2020-02-11T14:24:42.148+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","eventTag": "With Stimuli Screen","eventMs": "6"},{"tagDate" : "2020-02-11T14:24:58.789+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","eventTag": "hammer_server","eventMs": "2999"}]' -H 'Content-Type: application/json' $currentUrl/timeStamp
    curl -d '[{"tagDate" : "2020-02-11T14:24:45.143+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "3001"},{"tagDate" : "2020-02-11T14:24:48.142+0100","experimentName": "hammer_server","userId": "17033cba808-3c8b-4f1d-7429-7bd6","screenName": "hammer_server","dataChannel": 1,"responseGroup": "ratingButton","stimulusId": "hammer_server","response": "hammer_server","isCorrect": null,"gamesPlayed": "0","totalScore": "0","totalPotentialScore": "0","currentScore": "0","correctStreak": "0","errorStreak": "0","potentialScore": "0","maxScore": "0","maxErrors": "0","maxCorrectStreak": "0","maxErrorStreak": "0","maxPotentialScore": "0","eventMs": "6000"}]' -H 'Content-Type: application/json' $currentUrl/stimulusResponse
done