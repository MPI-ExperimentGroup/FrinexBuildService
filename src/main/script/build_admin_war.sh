#!/bin/bash
cleanedInput="$1"

if [[ ! "$cleanedInput" =~ ^[a-z0-9_]+$ ]]; then
    echo "Invalid input: $cleanedInput" >&2
    exit 1
fi

if [[ ! "$cleanedInput" =~ _(staging|production)_(web|admin)$ ]]; then
    echo "Invalid stage or type: $cleanedInput" >&2
    exit 1
fi

buildName=$(echo "$cleanedInput" | sed -E 's/_(staging|production)_(web|admin)$//')

if [ ! -f "/FrinexBuildService/artifacts/$buildName/$buildName.xml" ]; then
    echo "Config file not found: /FrinexBuildService/artifacts/$buildName/$buildName.xml" >&2
    exit 1
fi

buildContainerName="$cleanedInput"
frinexVersion="admin-stable" #            + ((currentEntry.frinexVersion === "alpha") ? "alpha" : 'admin-stable')
buildContainerOptions=$(grep buildContainerOptions /FrinexBuildService/publish.properties | sed "s/buildContainerOptions[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r");
configServer=$(grep configServer /FrinexBuildService/publish.properties | sed "s/configServer[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r");
stagingServer=$(awk '/^\[staging\]/{f=1;next} /^\[/{f=0} f && /^serverName[ ]*=/{sub(/^serverName[ ]*=[ ]*/,""); print; exit}' /FrinexBuildService/publish.properties | tr -d "\n\r");
stagingServerUrl=$(awk '/^\[staging\]/{f=1;next} /^\[/{f=0} f && /^serverUrl[ ]*=/{sub(/^serverUrl[ ]*=[ ]*/,""); print; exit}' /FrinexBuildService/publish.properties | tr -d "\n\r");
stagingDbHost=$(awk '/^\[staging\]/{f=1;next} /^\[/{f=0} f && /^dbHost[ ]*=/{sub(/^dbHost[ ]*=[ ]*/,""); print; exit}' /FrinexBuildService/publish.properties | tr -d "\n\r");
allowDelete=$(grep -o 'allowDataDeletion="[^"]*"' /FrinexBuildService/artifacts/$buildName/$buildName.xml | sed 's/allowDataDeletion="//;s/"//' || echo 'false')
securityGroup=$(grep -o 'securityGroup="[^"]*"' /FrinexBuildService/artifacts/$buildName/$buildName.xml | sed 's/securityGroup="//;s/"//' || echo '')


echo "cleanedInput: $cleanedInput"
echo "buildName: $buildName"
echo "buildContainerName: $buildContainerName"
echo "buildContainerOptions: $buildContainerOptions"
echo "frinexVersion: $frinexVersion"
echo "configServer: $configServer"
echo "stagingServer: $stagingServer"
echo "stagingServerUrl: $stagingServerUrl"
echo "stagingDbHost: $stagingDbHost"
echo "allowDelete: $allowDelete"
echo "securityGroup: $securityGroup"

            # // + ((["load_test_target", "with_stimulus_example", "thijs_test_3"].includes(buildName)) ? 'admin-beta' : ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable'))
            # + ((["load_test_target", "with_stimulus_example", "thijs_test_3"].includes(buildName)) ? 'admin-beta' : 'admin-stable')

# /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
#             // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            
#   terminate existing docker containers by name 
        # // var dockerString = 'sudo docker container rm -f ' + buildContainerName
        #     /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
        #     // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
        #     // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
        #     // using sed to replace the deprecated DB URL in very old build images like 1.3-audiofix
        #     // + " sed -i 's|localhost:5432|" + stagingDbHost + "|g' /ExperimentTemplate/registration/src/main/resources/application.properties;"
        #     // the target 'compile' is used to cause compilation errors to show up before all the effort/time of the full build process
        #     /* currentEntry.isWebApp && isWebApp is incorrect, non web apps still need the admin */
        #     /* limiting tomcat deployments to when a server is specified */ 
        #     // quiet output
        #     //  2024-07-18 suppressing the inclusion of the desktop and mobile application artifacts to save server side disk space
        #     // admin login for staging is taken from the settings.xml rather than the publish.properties
        #     // + ' -Dexperiment.configuration.admin.password=' + stagingAdminToken
        #     //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
        #     // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
        #     //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
        #     // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
        # 2026-06-09 destinationServerUrl and destinationServer actions have been removed because they are tomcat only 
            # + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            # + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
        # 2026-06-09 the following has also been removed :
            # + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-cordova.zip;'
            # + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-electron.zip;'
            # + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-vr.zip;'
            # + ' mkdir ' + targetDirectory + '/' + currentEntry.buildName + '/included_artifacts/;'
        # 2026-06-09 
            # removed -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
        # 2026-06-10 
            #             + ' -Dexperiment.isScalable=' + currentEntry.isScalable
            # + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            # + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            # -Dexperiment.groupsSocketUrl=$stagingGroupsSocketUrl \

sudo docker container rm -f "$buildContainerName" &> /dev/null;
sudo docker run --rm $buildContainerOptions \
                --name "$buildContainerName" \
                -v processingDirectory:/FrinexBuildService/processing \
                -v buildServerTarget:/FrinexBuildService/artifacts \
                -v protectedDirectory:/FrinexBuildService/protected \
                -v m2Directory:/maven/.m2/ \
                -w /ExperimentTemplate "frinexapps-jdk:$frinexVersion" \
                /bin/bash -c "cd /ExperimentTemplate/registration; \
                    mvn clean compile package \
                    -gs /maven/.m2/settings.xml \
                    -DskipTests \
                    -q \
                    -Dexperiment.configuration.name='$buildName' \
                    -Dexperiment.webservice='$configServer' \
                    -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building \
                    -Dexperiment.artifactsJsonDirectory=/FrinexBuildService/artifacts/$buildName/included_artifacts/ \
                    -DversionCheck.allowSnapshots=false \
                    -Dexperiment.destinationServer='$stagingServer' \
                    -Dexperiment.destinationServerUrl='$stagingServerUrl' \
                    -Dexperiment.configuration.db.host='$stagingDbHost' \
                    -Dexperiment.configuration.admin.allowDelete='$allowDelete' \
                    -Dexperiment.configuration.securityGroup='$securityGroup'; \
                    cp /ExperimentTemplate/registration/target/${buildName}-frinex-admin-*-*.war /FrinexBuildService/protected/$buildName/${buildName}_staging_admin.war; \
                    mv /ExperimentTemplate/registration/target/${buildName}-frinex-admin-*-*-sources.jar /FrinexBuildService/artifacts/$buildName/${buildName}_staging_admin_sources.jar; \
                    chmod 775 -R /FrinexBuildService/protected/$buildName/; \
                    chmod 775 -R /FrinexBuildService/artifacts/$buildName/; \
                    chown -R 101010 /FrinexBuildService/artifacts/$buildName/; \
                    chown -R 101010 /FrinexBuildService/protected/$buildName/; \
                    echo \"build $buildContainerName complete\"; \
                ";
# sync the built WAR and JAR files
bash /FrinexBuildService/script/sync_file_to_swarm_nodes.sh /FrinexBuildService/protected/$buildName/${buildName}_staging_admin.war /FrinexBuildService/artifacts/$buildName/${buildName}_staging_admin_sources.jar;
