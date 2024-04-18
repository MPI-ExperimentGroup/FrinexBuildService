
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
# https://<frinexbuild>:8010/cgi-bin/frinex_restart_experient.cgi
# http://<frinexbuild>:8010/frinex_stopped_experiments.txt
# http://<frinexbuild>:8010/frinex_restart_experient.log
