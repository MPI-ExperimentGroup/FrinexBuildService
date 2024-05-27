
# TODO: based on the lastParticipantSeen set the experiments to sleep by docker service rm
# TODO: based on the nginx upstreams backup requests restart the docker services from the protected directory

#https://frinexproduction.mpi.nl/stairs4words2public-admin/public_usage_stats

# {"firstDeploymentAccessed":"2022-02-22T18:00:44.225+00:00","totalDeploymentsAccessed":6,"totalPageLoads":14,"totalParticipantsSeen":1,"totalStimulusResponses":18,"totalMediaResponses":0,"totalDeletionEvents":0,"firstParticipantSeen":"2022-02-22T18:00:45.637+00:00","lastParticipantSeen":"2024-03-06T11:38:54.455+00:00","participantsFirstAndLastSeen":[["2022-02-22T18:00:45.637+00:00","2024-03-06T11:38:54.455+00:00"]],"sessionFirstAndLastSeen":[["2022-02-22T18:00:44.619+00:00","2024-03-06T11:39:13.819+00:00"],["2023-09-29T10:57:46.272+00:00","2023-09-29T10:57:46.272+00:00"],["2024-01-31T10:16:44.906+00:00","2024-01-31T10:16:44.906+00:00"],["2024-01-31T10:33:03.410+00:00","2024-01-31T10:33:03.410+00:00"],["2024-03-06T11:38:36.152+00:00","2024-03-06T11:38:36.152+00:00"]]}
# "lastParticipantSeen":"2024-03-06T11:38:54.455+00:00"

#b55427ef0739:/FrinexBuildService$ ls protected/wfna_s1_4/wfna_s1_4_production_admin*
#protected/wfna_s1_4/wfna_s1_4_production_admin.Docker  protected/wfna_s1_4/wfna_s1_4_production_admin.war

#docker run -v buildServerTarget:/FrinexBuildService/artifacts -v protectedDirectory:/FrinexBuildService/protected --rm -it frinexbuild:latest bash

#sudo docker service rm with_stimulus_example_staging_admin;  // this might not be a smooth transition to rm first, but at this point we do not know if there is an existing service to use service update
#sudo docker service create --name with_stimulus_example_staging_admin --replicas=1 --limit-cpu="2.0" --limit-memory=2048m -d -p 8080 lux27.mpi.nl/with_stimulus_example_staging_admin:stable;

# TODO: when an experiment has been resurrected a record can be sent to the screen views table about the restart which can also update the lastParticipantSeen date
# https://<frinexbuild>/cgi-bin/frinex_restart_experient.cgi
# http://<frinexbuild>:8010/frinex_stopped_experiments.txt
# http://<frinexbuild>/frinex_restart_experient.log


serviceNameArray=$(sudo docker service ls --format '{{.Name}}' | grep -E "_staging_web$|_staging_admin$|_production_web$|_production_admin$")
totalConsidered=0
canBeTerminated=0
hasRecentUse=0

recentUseDates="2024"
for serviceName in $serviceNameArray; do
    ((totalConsidered++))
    echo "serviceName $serviceName"
    updatedAt=$(sudo docker service inspect --format '{{.UpdatedAt}}' "$serviceName")
    echo "updatedAt $updatedAt"
    # note that this ignores the seconds already passed in the current day by rounding it to YYYYMMDD
    secondsSince1970=$(date +%s -d "${updatedAt:0:10}")
    # echo "secondsSince1970 $secondsSince1970"
    daysSinceStarted=$((($(date +%s) - $secondsSince1970)/60/60/24))
    echo "daysSinceStarted $daysSinceStarted"
    if (( $daysSinceStarted > 1 )); then
        echo "targeted for shutdown: $serviceName"
        adminServiceName=$(echo "$serviceName" | sed 's/_web$/_admin/g')
        adminContextPath=$(echo "$serviceName" | sed -E 's/(_staging_web$|_staging_admin$|_production_web$|_production_admin$)/-admin/g')
        experimentArtifactsDirectory=$(echo "$serviceName" | sed -E 's/(_staging_web$|_staging_admin$|_production_web$|_production_admin$)//g')
        echo "adminServiceName: $adminServiceName"
        echo "adminContextPath: $adminContextPath"
        echo "artifactsDirectory: $experimentArtifactsDirectory"
        servicePortNumber=$(sudo docker service inspect --format "{{.Endpoint.Ports}}" $adminServiceName | awk '{print $4}')
        echo "servicePortNumber: $servicePortNumber"
        curl http://frinexbuild:$servicePortNumber/$adminContextPath/public_usage_stats > /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.json
        cat /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.json
        echo ""
        echo ""
        if cat /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.json | grep -qE "sessionFirstAndLastSeen.*($recentUseDates).*\]\]"; then 
            ((hasRecentUse++))
            echo 'recent use detected'; 
        else
            ((canBeTerminated++))
            echo 'can be terminated';
            # terminate both the admin and web services for this experiment
            webServiceName=$(echo "$adminServiceName" | sed 's/_admin$/_web/g')
            echo "adminServiceName: $adminServiceName"
            sudo docker service rm "$adminServiceName"
            echo "webServiceName: $webServiceName"
            sudo docker service rm "$webServiceName"
        fi
    fi
    echo ""
done

echo "totalConsidered: $totalConsidered"
echo "canBeTerminated: $canBeTerminated"
echo "hasRecentUse: $hasRecentUse"

# serviceByMemory=$(docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.CreatedAt}}" | sort -k 3 -h -r)
# echo "$serviceByMemory"
# echo "$serviceByMemory" | sed -n '2 p'


# the following lines are intended to test the server load by starting up all sleeping experiments, use with caution
# for experimentUrl in $(curl http://frinexbuild.mpi.nl:8010/frinex_stopped_experiments.txt | grep production); do curl http://frinexbuild.mpi.nl:8010/cgi/frinex_restart_experient.cgi?$experimentUrl; done;
# for experimentUrl in $(curl http://frinexbuild.mpi.nl:8010/frinex_stopped_experiments.txt | grep staging); do curl http://frinexbuild.mpi.nl:8010/cgi/frinex_restart_experient.cgi?$experimentUrl; done;

# terminate services that have failed to start up
# docker service ls | grep 0/1 | wc -l
# for deadService in $(docker service ls | grep 0/1 | awk '{print $2}'); do docker service rm $deadService; done
# docker service ls | grep 0/1 | wc -l


# https://frinexstaging.mpi.nl/with_stimulus_example_alpine-admin/public_usage_stats
# lastParticipantSeen":"2024-04-02T15:05:52.655+00:00
# "sessionFirstAndLastSeen":[["2018-12-28T19:12:52.045+00:00","2018-12-28T19:25:07.795+00:00"],["2018-12-28T19:25:16.781+00:00","2018-12-28T19:27:15.160+00:00"],["2019-01-02T10:31:22.599+00:00","2019-01-07T15:36:14.095+00:00"],["2019-01-02T10:42:18.978+00:00","2019-01-02T10:42:18.992+00:00"],["2019-01-02T10:42:30.815+00:00","2019-01-02T10:43:04.294+00:00"],["2019-01-02T13:50:44.599+00:00","2019-01-07T15:29:54.444+00:00"],["2019-01-07T15:52:14.906+00:00","2019-01-07T15:56:20.583+00:00"],["2019-01-07T15:58:36.405+00:00","2019-01-07T16:00:05.042+00:00"],["2019-01-07T16:19:24.023+00:00","2019-01-17T08:55:30.653+00:00"],["2019-01-07T16:56:09.141+00:00","2019-01-07T16:56:09.155+00:00"],["2019-01-08T16:44:59.789+00:00","2019-01-14T13:18:03.2
# $(curl https://frinexstaging.mpi.nl/with_stimulus_example_alpine-admin/public_usage_stats | grep -E 'sessionFirstAndLastSeen.*(2024).*\]\]')
