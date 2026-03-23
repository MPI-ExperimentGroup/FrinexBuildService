buildContainerOptions=$(grep buildContainerOptions /FrinexBuildService/publish.properties | sed "s/buildContainerOptions[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r");
buildContainerName="${currentEntry.buildName}_staging_admin";
frinexVersion="admin-stable"
            # // + ((["load_test_target", "with_stimulus_example", "thijs_test_3"].includes(currentEntry.buildName)) ? 'admin-beta' : ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable'))
            # + ((["load_test_target", "with_stimulus_example", "thijs_test_3"].includes(currentEntry.buildName)) ? 'admin-beta' : 'admin-stable')

# /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
#             // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            
sudo docker run --rm $buildContainerOptions --name $buildContainerName \
            -v processingDirectory:/FrinexBuildService/processing \
            -v buildServerTarget:' + targetDirectory \
            -v protectedDirectory:' + protectedDirectory \
            -v m2Directory:/maven/.m2/ \
            -w /ExperimentTemplate frinexapps-jdk:$frinexVersion \
            /bin/bash -c "cd /ExperimentTemplate/registration; \
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            // using sed to replace the deprecated DB URL in very old build images like 1.3-audiofix
            + " sed -i 's|localhost:5432|" + stagingDbHost + "|g' /ExperimentTemplate/registration/src/main/resources/application.properties;"
            + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-cordova.zip;'
            + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-electron.zip;'
            + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-*-vr.zip;'
            + ' mkdir ' + targetDirectory + '/' + currentEntry.buildName + '/included_artifacts/;'
            // + ' ls -l ' + targetDirectory + '/' + currentEntry.buildName + ' &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt;'
            + ' mvn clean compile ' // the target 'compile' is used to cause compilation errors to show up before all the effort/time of the full build process
            + ((/* currentEntry.isWebApp && isWebApp is incorrect, non web apps still need the admin */ deploymentType.includes('staging_tomcat') || ( /* limiting tomcat deployments to when a server is specified */ currentEntry.stagingServer != null && currentEntry.stagingServer.length > 0)) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            //+ ' -pl frinex-admin'
            + ' -q' // quiet output
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            //  2024-07-18 suppressing the inclusion of the desktop and mobile application artifacts to save server side disk space
            + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/included_artifacts/'
            // + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            + ' -Dexperiment.configuration.db.host=' + stagingDbHost
            + ' -Dexperiment.configuration.admin.allowDelete=' + ((currentEntry.allowDelete != null) ? currentEntry.allowDelete : 'false')
            // admin login for staging is taken from the settings.xml rather than the publish.properties
            // + ' -Dexperiment.configuration.admin.password=' + stagingAdminToken
            + ' -Dexperiment.configuration.securityGroup=_security_group_'
            + ' -Dexperiment.isScalable=' + currentEntry.isScalable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-*.war ' + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' mv /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-*-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + " chmod 775 -R " + protectedDirectory + "/" + currentEntry.buildName + "/;"
            + " chmod 775 -R " + targetDirectory + "/" + currentEntry.buildName + "/;"
            + " chown -R 101010 " + targetDirectory + "/" + currentEntry.buildName + "/;"
            + " chown -R 101010 " + protectedDirectory + "/" + currentEntry.buildName + "/;"
            + ' echo "build complete" &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt;'
            + '"'
            child_process.execSync(dockerString.replace("_security_group_", currentEntry.securityGroup ?? ''), { stdio: [0, 1, 2] });