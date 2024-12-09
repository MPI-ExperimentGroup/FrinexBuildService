
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

# make a list of all experiments that are running even if only the web or admin service is running
serviceNameArray=$(sudo docker service ls --format '{{.Name}}' | grep -E "_staging_web$|_staging_admin$|_production_web$|_production_admin$" | sed 's/_web$/_admin/g' | sort | uniq)
totalConsidered=0
canBeTerminated=0
hasRecentUse=0
recentyStarted=0
unusedNewHealthy=0
needsStarting=0
needsUpdating=0

# experiments with a sessionFirstAndLastSeen record matching the following months regex will be kept running
recentUseDates="$(date -d "$(date +%Y-%m-01) -5 month" +%Y-%m)|$(date -d "$(date +%Y-%m-01) -4 month" +%Y-%m)|$(date -d "$(date +%Y-%m-01) -3 month" +%Y-%m)|$(date -d "$(date +%Y-%m-01) -2 month" +%Y-%m)|$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m)|$(date -d "$(date +%Y-%m-01) -0 month" +%Y-%m)"
echo "recentUseDates $recentUseDates"
for serviceName in $serviceNameArray; do
    ((totalConsidered++))
    echo "serviceName $serviceName"
    updatedAt=$(sudo docker service inspect --format '{{.UpdatedAt}}' "$serviceName")
    echo "updatedAt $updatedAt"
    # note that this ignores the seconds already passed in the current minute by rounding it to YYYYMMDD HH:MM
    secondsSince1970=$(date +%s -d "${updatedAt:0:16}")
    # echo "secondsSince1970 $secondsSince1970"
    if [[ ! "$secondsSince1970" ]]; then
        ((recentyStarted++))
        echo ""
        echo 'recenty started, date not found'; 
    else
        daysSinceStarted=$((($(date +%s) - $secondsSince1970)/60/60/24))
        hoursSinceStarted=$((($(date +%s) - $secondsSince1970)/60/60))
        minutesSinceStarted=$((($(date +%s) - $secondsSince1970)/60))
        echo "daysSinceStarted $daysSinceStarted, hoursSinceStarted $hoursSinceStarted, minutesSinceStarted $minutesSinceStarted"
        if (( $minutesSinceStarted > 60 )); then
            # echo "considering: $serviceName"
            adminServiceName=$(echo "$serviceName" | sed 's/_web$/_admin/g')
            webServiceName=$(echo "$adminServiceName" | sed 's/_admin$/_web/g')
            adminContextPath=$(echo "$serviceName" | sed -E 's/(_staging_web$|_staging_admin$|_production_web$|_production_admin$)/-admin/g')
            webContextPath=$(echo "$serviceName" | sed -E 's/(_staging_web$|_staging_admin$|_production_web$|_production_admin$)//g')
            experimentArtifactsDirectory=$(echo "$serviceName" | sed -E 's/(_staging_web$|_staging_admin$|_production_web$|_production_admin$)//g')
            # echo "adminServiceName: $adminServiceName"
            # echo "adminContextPath: $adminContextPath"
            # echo "webServiceName: $webServiceName"
            # echo "webContextPath: $webContextPath"
            # echo "artifactsDirectory: $experimentArtifactsDirectory"
            servicePortNumber=$(sudo docker service inspect --format "{{.Endpoint.Ports}}" $adminServiceName | awk '{print $4}')
            echo "servicePortNumber: $servicePortNumber"
            if [[ "$servicePortNumber" ]]; then
                sudo chown -R frinex:www-data /FrinexBuildService/artifacts/$experimentArtifactsDirectory/
                sudo chmod -R ug+rwx /FrinexBuildService/artifacts/$experimentArtifactsDirectory/
                curl --silent http://frinexbuild:$servicePortNumber/$adminContextPath/public_usage_stats > /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp
            else
                echo "servicePortNumber not found so using the last known public_usage_stats"
            fi
            # cat /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp
            # echo ""
            echo ""
            if cat /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp | grep -qE "sessionFirstAndLastSeen.*($recentUseDates).*\]\]"; then 
                ((hasRecentUse++))
                echo 'recent use detected';
                mv -f /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.json
                # wakeResult=$(curl -k --silent http://frinexbuild.mpi.nl:8010/cgi/frinex_restart_experient.cgi?$webServiceName)
                # echo "wakeResult: $wakeResult"
            else
                # this section will terminate both the admin and web services for this experiment
                # check that we got a valid JSON response by looking for sessionFirstAndLastSeen, if found then wait until the service is N days old otherwise terminate it
                if cat /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp | grep -qE "sessionFirstAndLastSeen"; then
                    mv -f /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.json
                    if (( $daysSinceStarted < 14 )); then 
                        ((unusedNewHealthy++))
                        echo 'recenty started, unused but healthy'; 
                        echo ""
                        # wakeResult=$(curl -k --silent http://frinexbuild.mpi.nl:8010/cgi/frinex_restart_experient.cgi?$webServiceName)
                        # echo "wakeResult: $wakeResult"
                    else
                        ((canBeTerminated++))
                        # echo "adminServiceName: $adminServiceName"
                        sudo docker service rm "$adminServiceName"
                        # echo "webServiceName: $webServiceName"
                        sudo docker service rm "$webServiceName"
                        echo ""
                        echo 'no recent use so can be terminated';
                    fi
                else
                    ((canBeTerminated++))
                    # echo "adminServiceName: $adminServiceName"
                    sudo docker service rm "$adminServiceName"
                    # echo "webServiceName: $webServiceName"
                    sudo docker service rm "$webServiceName"
                    echo ""
                    echo 'broken so can be terminated';
                    rm /FrinexBuildService/artifacts/$experimentArtifactsDirectory/$serviceName-public_usage_stats.temp
                fi
            fi
            # if its not been shutdown then check the web component and kill if not healthy (we could "service update --force" but that might keep repeating)
            webPortNumber=$(sudo docker service inspect --format "{{.Endpoint.Ports}}" $webServiceName | awk '{print $4}')
            if [[ "$webPortNumber" ]]; then
                healthResult=$(curl -k --silent -H 'Content-Type: application/json' http://frinexbuild:$webPortNumber/$webContextPath/actuator/health)
                if [[ $healthResult == *"\"status\":\"UP\""* ]]; then
                    echo "web component OK"
                else
                    ((needsUpdating++))
                    echo "healthResult: $healthResult"
                    sudo docker service rm "$webServiceName"
                    # sudo docker service update "$webServiceName"
                    # sudo docker service update --force "$webServiceName"
                    echo ""
                    echo "broken web component";
                    # echo "updating web component";
                fi
            # else
            #     ((needsUpdating++))
            #     echo "starting web componet"
            #     curl "http://frinexbuild:8010/cgi/frinex_restart_experient.cgi?$webServiceName"
            fi
        else
            ((recentyStarted++))
            echo ""
            echo 'recenty started, waiting for startup'; 
        fi
    fi
    echo ""
done

echo "starting missing services"
serviceNameUpdatedArray=$(sudo docker service ls --format '{{.Name}}' | grep -E "_staging_web$|_staging_admin$|_production_web$|_production_admin$" | sed 's/_web$/_admin/g' | sort | uniq)
for expectedServiceName in $(grep -lE "sessionFirstAndLastSeen.*($recentUseDates).*\]\]" /FrinexBuildService/artifacts/*/*_admin-public_usage_stats.json | awk -F '/' '{print $5}' | sed 's/_admin-public_usage_stats.json//g'); do
    echo "expectedServiceName: $expectedServiceName"
    if [[ $serviceNameUpdatedArray == *"$expectedServiceName"* ]]; then
        echo "$expectedServiceName OK"
    else
        ((needsStarting++))
        echo "$expectedServiceName requesting start up"
        curl "http://frinexbuild:8010/cgi/frinex_restart_experient.cgi?${expectedServiceName}_admin"
        curl "http://frinexbuild:8010/cgi/frinex_restart_experient.cgi?{$expectedServiceName}_web"
    fi
done

if (( $canBeTerminated > 0 )); then
    curl PROXY_UPDATE_TRIGGER
fi

# docker logs -f frinex_service_manager | grep -B 10 -E "(requesting|starting|updating|broken|terminated)"

date
echo ""
echo "totalConsidered: $totalConsidered"
echo "canBeTerminated: $canBeTerminated"
echo "recentyStarted: $recentyStarted"
echo "unusedNewHealthy: $unusedNewHealthy"
echo "hasRecentUse: $hasRecentUse"
echo "needsUpdating: $needsUpdating"
echo "needsStarting: $needsStarting"

echo "start generate some data for Grafana"
echo "{" > /FrinexBuildService/artifacts/grafana_stats_temp.json
for serviceStatsFile in $(ls /FrinexBuildService/artifacts/*/*_admin-public_usage_stats.json); do
    serviceStatsName=$(echo "$serviceStatsFile" | sed "s|.*/||g" | sed "s/-public_usage_stats.json//g"); 
    echo "$serviceStatsName"
    echo "\"$serviceStatsName\":" >> /FrinexBuildService/artifacts/grafana_stats_temp.json
    if [ -s $serviceStatsFile ]; then
        cat $serviceStatsFile >> /FrinexBuildService/artifacts/grafana_stats_temp.json
    else
        echo "{\"noData\": true}" >> /FrinexBuildService/artifacts/grafana_stats_temp.json
    fi
    echo "," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
done
echo "\"date\": \"$(date)\"," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"totalConsidered\": $totalConsidered," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"canBeTerminated\": $canBeTerminated," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"recentyStarted\": $recentyStarted," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"unusedNewHealthy\": $unusedNewHealthy," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"hasRecentUse\": $hasRecentUse," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"needsUpdating\": $needsUpdating," >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "\"needsStarting\": $needsStarting" >> /FrinexBuildService/artifacts/grafana_stats_temp.json
echo "}" >> /FrinexBuildService/artifacts/grafana_stats_temp.json
mv /FrinexBuildService/artifacts/grafana_stats_temp.json /FrinexBuildService/artifacts/grafana_stats.json

echo "generating some time series data for Grafana"
echo "$(date),$totalConsidered,$canBeTerminated,$recentyStarted,$unusedNewHealthy,$hasRecentUse,$needsUpdating,$needsStarting" > /FrinexBuildService/artifacts/grafana_running_stats_temp.json
head -n 1000  /FrinexBuildService/artifacts/grafana_running_stats.json >> /FrinexBuildService/artifacts/grafana_running_stats_temp.json
mv /FrinexBuildService/artifacts/grafana_running_stats_temp.json /FrinexBuildService/artifacts/grafana_running_stats.json

echo "end generate some data for Grafana"

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
