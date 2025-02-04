#!/usr/bin/env node
/*
 * Copyright (C) 2018 Max Planck Institute for Psycholinguistics
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */


/**
 * @since April 3, 2018 10:40 PM (creation date)
 * @author Peter Withers <peter.withers@mpi.nl>
 */

/*
 * This script publishes FRINEX experiments that are found in the configuration GIT repository after being triggered by a GIT hooks.
 * 
 * Prerequisites for this script:
 *        npm install request
 *        npm install maven
 *        npm install properties-reader
 */

"use strict";

import PropertiesReader from 'properties-reader';
const properties = PropertiesReader('ScriptsDirectory/publish.properties');
import child_process from 'child_process';
import got from 'got';
import fs from 'fs';
import path from 'path';
import os from 'os';
import diskSpace from 'check-disk-space';
import generatePassword from 'omgopass';
import sslChecker from 'ssl-checker';
const m2Settings = properties.get('settings.m2Settings');
const concurrentBuildCount = properties.get('settings.concurrentBuildCount');
const deploymentType = properties.get('settings.deploymentType');
const dockerRegistry = properties.get('dockerservice.dockerRegistry');
const proxyUpdateTrigger = properties.get('dockerservice.proxyUpdateTrigger');
const dockerServiceOptions = properties.get('dockerservice.serviceOptions');
const buildContainerOptions = properties.get('settings.buildContainerOptions');
const taskContainerOptions = properties.get('settings.taskContainerOptions');
const listingDirectory = properties.get('settings.listingDirectory');
const certificateCheckList = properties.get('settings.certificateCheckList');
const incomingDirectory = properties.get('settings.incomingDirectory');
const processingDirectory = properties.get('settings.processingDirectory');
const buildHost = properties.get('settings.buildHost');
const staticFilesDirectory = incomingDirectory + '/static';
const targetDirectory = properties.get('settings.targetDirectory');
const protectedDirectory = properties.get('settings.protectedDirectory');
const configServer = properties.get('webservice.configServer');
const stagingServer = properties.get('staging.serverName');
const stagingServerUrl = properties.get('staging.serverUrl');
const stagingGroupsSocketUrl = properties.get('staging.groupsSocketUrl');
const stagingDbHost = properties.get('staging.dbHost');
// admin login for staging is taken from the settings.xml rather than the publish.properties
// const stagingAdminToken = properties.get('staging.adminToken');
const productionServer = properties.get('production.serverName');
const productionServerUrl = properties.get('production.serverUrl');
const productionGroupsSocketUrl = properties.get('production.groupsSocketUrl');
const productionDbHost = properties.get('production.dbHost');

var resultsFile; // this is set once in startResult after the file is populated
const statsFile = fs.openSync(targetDirectory + "/buildstats.txt", "a"); //{ flags: 'w', mode: 0o774 });
const listingMap = new Map();
const currentlyBuilding = new Map();
const buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildHistoryJson = { table: {} };
const experimentTokensFileName = protectedDirectory + "/tokens.json";
var experimentTokensJson = {};
const buildStatisticsFileName = targetDirectory + "/buildstats.json";
var buildStatisticsJson = {};
var availableImageList = "";
var hasDoneBackup = false;
var waitingServiceCounter = 0;
// var gtwBuildingCount = 0; // gtwBuildingCount is used to limit the GWT builds to about one at a time, while the rest of the build stages can be in parallel

function startResult() {
    buildHistoryJson.building = true;
    fs.writeFileSync(targetDirectory + "/index.html", fs.readFileSync("/FrinexBuildService/buildlisting.html"));
    fs.writeFileSync(targetDirectory + "/buildlisting.js", fs.readFileSync("/FrinexBuildService/buildlisting.js"));
    resultsFile = fs.openSync(targetDirectory + "/index.html", "a"); //{ flags: 'w', mode: 0o774 });
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o774 });
    // there is no point syncing buildlisting.js to the swarm because it is not in a volume
}

function getExperimentToken(name) {
    // perhaps store the token mapped to authenticate committer and the expriment name so that the commiter can be used in the CGI as authenticated user
    if (typeof experimentTokensJson[name] !== "undefined") {
        return experimentTokensJson[name];
    } else {
        const tokenString = generatePassword();
        experimentTokensJson[name] = tokenString;
        fs.writeFileSync(experimentTokensFileName, JSON.stringify(experimentTokensJson, null, 4), { mode: 0o774 });
        return tokenString;
    }
}

function initialiseResult(name, message, isError, repositoryName, committerName) {
    var style = '';
    if (isError) {
        style = 'background: #F3C3C3';
    }
    buildHistoryJson.table[name] = {
        "_experiment": { value: name, style: '' },
        "_repository": { value: repositoryName, style: '' },
        "_committer": { value: committerName, style: '' },
        "_frinex_version": { value: '', style: '' },
        "_date": { value: new Date().toISOString(), style: '' },
        //"_validation_link_json": {value: '', style: ''},
        //"_validation_link_xml": {value: '', style: ''},
        "_validation_json_xsd": { value: message, style: style },
        "_staging_web": { value: '', style: '' },
        "_staging_android": { value: '', style: '' },
        "_staging_desktop": { value: '', style: '' },
        "_staging_admin": { value: '', style: '' },
        "_production_target": { value: '', style: '' },
        "_production_web": { value: '', style: '' },
        "_production_android": { value: '', style: '' },
        "_production_desktop": { value: '', style: '' },
        "_production_admin": { value: '', style: '' }
    };
    // todo: remove any listing.json
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o774 });
}

function storeResult(name, message, stage, type, isError, isBuilding, isDone, stageBuildTime) {
    buildHistoryJson.table[name]["_date"].value = new Date().toISOString();
    //buildHistoryJson.table[name]["_date"].value = '<a href="' + currentEntry.buildName + '/' + name + '.xml">' + new Date().toISOString() + '</a>';
    buildHistoryJson.table[name]["_" + stage + "_" + type].value = message;
    if (isError) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #F3C3C3';
        if (!isBuilding) {
            // if no longer building after the error then update the queued labels to indicate skipped
            for (var index in buildHistoryJson.table[name]) {
                if (buildHistoryJson.table[name][index].value === "queued") {
                    // updating the label to skipped is not wanted when its the apk or exe that failed because they do not terminate later parts of the build
                    buildHistoryJson.table[name][index].value = "skipped";
                }
            }
        }
    } else if (isBuilding) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #C3C3F3';
    } else if (isDone) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #C3F3C3';
    } else {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = '';
    }
    if (typeof stageBuildTime !== "undefined") {
        buildHistoryJson.table[name]["_" + stage + "_" + type].ms = (stageBuildTime);
        fs.writeSync(statsFile, new Date().toISOString() + "," + name + "," + stage + "," + type + "," + (stageBuildTime) + "," + os.freemem() + "\n");
        buildHistoryJson.memoryFree = os.freemem();
        buildHistoryJson.memoryTotal = os.totalmem();
        diskSpace('/').then((info) => {
            buildHistoryJson.diskFree = info.free;
            buildHistoryJson.diskTotal = info.size;
        });
        // update the last build stats
        if (stage + "_" + type in buildStatisticsJson) {
            var n = 10;
            buildStatisticsJson[stage + "_" + type] = buildStatisticsJson[stage + "_" + type] * (n - 1) / n + stageBuildTime / n;
        } else {
            buildStatisticsJson[stage + "_" + type] = (stageBuildTime);
        }
        fs.writeFileSync(buildStatisticsFileName, JSON.stringify(buildStatisticsJson, null, 4), { mode: 0o774 });
        // update the docker service listing JSON (this moment is not so critical since the services will be changing regardless of this process)
        updateServicesJson();
    }
    buildHistoryJson.table[name]["_" + stage + "_" + type].built = (!isError && !isBuilding && isDone);
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o774 });
    syncFileToSwarmNodes(buildHistoryFileName);
}

function stopUpdatingResults() {
    console.log('build process complete');
    fs.writeSync(resultsFile, "<div>build process complete</div>");
    // update the docker service listing JSON (one last chance to update the service listing)
    updateServicesJson();
    triggerProxyUpdate();
    buildHistoryJson.building = false;
    buildHistoryJson.buildDate = new Date().toISOString();
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o774 });
    syncFileToSwarmNodes(buildHistoryFileName);
}

function unDeploy(currentEntry) {
    console.log("unDeploy");
    var stageStartTime = new Date().getTime();
    console.log("request to unDeploy " + currentEntry.buildName);
    // undeploy staging gui
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">undeploying</a>', "staging", "web", false, true, false);
    var queuedConfigFile = path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml');

    syncDeleteFromSwarmNodes(currentEntry.buildName, "undeploy");

    // check if the deploymentType is tomcat vs docker and do the required undeployment process
    var dockerString = "";

    if (deploymentType.includes('docker')) {
        // dockerString += "sudo docker service ls | grep " + currentEntry.buildName + "_staging_web && "
        dockerString += "sudo docker service rm " + currentEntry.buildName + '_staging_web' + " || true\n"
    }
    if (deploymentType.includes('staging_tomcat')) {
        var buildContainerName = currentEntry.buildName + '_undeploy';
        dockerString += 'sudo docker container rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + 'sudo docker run'
            + ' --rm '
            + taskContainerOptions
            + ' --name ' + buildContainerName
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:stable /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + ' mvn tomcat7:undeploy '
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_web.war'
            // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + '"';
    }
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("staging frinex-gui undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">undeployed</a>', "staging", "web", false, false, false);
    } catch (error) {
        console.error(`staging frinex-gui undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">undeploy error</a>', "staging", "web", true, false, true);
    }
    // undeploy staging admin
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">undeploying</a>', "staging", "admin", false, true, false);
    var dockerString = "";
    if (deploymentType.includes('docker')) {
        // dockerString += "sudo docker service ls | grep " + currentEntry.buildName + "_staging_admin && "
        dockerString += "sudo docker service rm " + currentEntry.buildName + '_staging_admin' + " || true\n"
    }
    if (deploymentType.includes('staging_tomcat')) {
        dockerString += 'sudo docker container rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + taskContainerOptions
            + ' --name ' + buildContainerName
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:stable /bin/bash -c "cd /ExperimentTemplate/registration;'
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + ' mvn tomcat7:undeploy '
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + '"';
    }
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("staging frinex-admin undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">undeployed</a>', "staging", "admin", false, false, false);
    } catch (error) {
        console.error(`staging frinex-admin undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">undeploy error</a>', "staging", "admin", true, false, true);
    }
    // undeploy production gui
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">undeploying</a>', "production", "web", false, true, false);
    var dockerString = "";
    if (deploymentType.includes('docker')) {
        // dockerString += "sudo docker service ls | grep " + currentEntry.buildName + "_production_web && "
        dockerString += "sudo docker service rm " + currentEntry.buildName + '_production_web' + " || true\n"
    }
    if (deploymentType.includes('production_tomcat')) {
        dockerString += 'sudo docker container rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
            + 'sudo docker run'
            + ' --rm '
            + taskContainerOptions
            + ' --name ' + buildContainerName
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:stable /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + ' mvn tomcat7:undeploy '
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                : ' -Dexperiment.destinationServer=' + productionServer
                + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
            )
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
            //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_web.war'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
            + '"';
    }
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("production frinex-gui undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">undeployed</a>', "production", "web", false, false, false);
    } catch (error) {
        console.error(`production frinex-gui undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">undeploy error</a>', "production", "web", true, false, true);
    }
    // undeploy production admin
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">undeploying</a>', "production", "admin", false, true, false);
    var dockerString = "";
    if (deploymentType.includes('docker')) {
        // dockerString += "sudo docker service ls | grep " + currentEntry.buildName + "_production_admin && "
        dockerString += "sudo docker service rm " + currentEntry.buildName + '_production_admin' + " || true\n"
    }
    if (deploymentType.includes('production_tomcat')) {
        dockerString += 'sudo docker container rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + taskContainerOptions
            + ' --name ' + buildContainerName
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:stable /bin/bash -c "cd /ExperimentTemplate/registration;'
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + ' mvn tomcat7:undeploy '
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                : ' -Dexperiment.destinationServer=' + productionServer
                + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
            )
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + '"';
    }
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("production frinex-admin undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">undeployed</a>', "production", "admin", false, false, false);
    } catch (error) {
        console.error(`production frinex-admin undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">undeploy error</a>', "production", "admin", true, false, true);
    }
    if (fs.existsSync(queuedConfigFile)) {
        fs.unlinkSync(queuedConfigFile);
    }
    currentlyBuilding.delete(currentEntry.buildName);
}

function updateServicesJson() {
    // 2024-07-17 the services.json file is now created and updated by the frinex_locations_update.cgi when the proxy update is triggered
    // if (deploymentType.includes('docker')) {
    //     // TODO: this might be a good point to update a list of Tomcat experiments
    //     // update the docker service listing JSON which is used to inform the user in the build listing HTML
    //     console.log("updateServicesJson");
    //     const servicesJsonFileName = targetDirectory + "/services.json";
    //     const servicesDockerString = "sudo docker service ls | grep -E \"_admin|_web\" | sed 's/->8080\\/tcp//g' | sed 's/[*:]//g' | awk '{print \"\\\"\" $2 \"\\\": {\\\"replicas\\\": \\\"\" $4 \"\\\", \\\"port\\\":\\\"\" $6 \"\\\"},\"}' | sed '$ s/,$/\}/g' | sed '1 s/^\"/\{\"/g' > " + servicesJsonFileName + ";";
    //     // console.log(servicesDockerString);
    //     child_process.execSync(servicesDockerString, { stdio: [0, 1, 2] });
    // }
}

function waitingServiceStart() {
    if (deploymentType.includes('docker') && waitingServiceCounter < 10) {
        waitingServiceCounter++;
        updateServicesJson();
        // check if all the services have started up
        console.log("checkServicesStatus: " + waitingServiceCounter);
        const servicesJsonFileName = targetDirectory + "/services.json";
        const contents = fs.readFileSync(servicesJsonFileName, 'utf8');
        const serviceStarting = contents.includes("\"0/");
        return serviceStarting;
    } else {
        return false;
    }
}

function triggerProxyUpdate() {
    // 2023-04-11 The proxy is no longer triggered here because the tomcat applications tell nginx to restart and this change is now in the stable version
    // triger the proxy to reaload the service list by calling the proxyUpdateTrigger URL
    // console.log("proxyUpdateTrigger (" + new Date().toISOString() + "): " + proxyUpdateTrigger);
    // log the services that were up at the time of the proxyUpdateTrigger
    // const servicesLogFileName = targetDirectory + "/proxyUpdateTrigger.log";
    // const servicesDockerString = "date >> " + servicesLogFileName + "; sudo docker service ls | grep -E \"_admin|_web\" >> " + servicesLogFileName + ";";
    // console.log(servicesDockerString);
    // child_process.execSync(servicesDockerString, { stdio: [0, 1, 2] });
    // got.get(proxyUpdateTrigger, { timeout: { request: 3000 }, https: { rejectUnauthorized: false } }).then(response => { //responseType: 'text/html', 
    //     console.log("proxyUpdateTrigger response (" + new Date().toISOString() + "): " + response.statusCode);
    // }).catch(error => {
    //     console.log("proxyUpdateTrigger error (" + new Date().toISOString() + "): " + error.message);
    // });
}

function deployDockerService(currentEntry, warFileName, serviceName, contextPath) {
    //const warFilePath = targetDirectory + "/" + currentEntry.buildName + "/" + warFileName;
    const dockerFilePath = protectedDirectory + "/" + currentEntry.buildName + "/" + serviceName + ".Docker";
    fs.writeFileSync(dockerFilePath,
        "FROM eclipse-temurin:21-jdk-alpine\n"
        + "COPY " + warFileName + " /" + warFileName + "\n"
        // + "CMD [\"java\", \"-jar\", \"/" + warFileName + "\", \"--server.servlet.context-path=/" + contextPath + "\""
        + "CMD [\"java\", \"-jar\", \"/" + warFileName + "\", \"--server.servlet.context-path=/" + contextPath + "\", \"--server.forward-headers-strategy=FRAMEWORK\""
        + ((currentEntry.state === "debug") ? ', \"--trace\"]\n' : ']\n')
        // TODO: it should not be necessary to do a service start, but this needs to be tested 
        // note that manually stopping the services will cause an outage whereas replacing the service will minimise service disruption
        , { mode: 0o774 });
    const serviceSetupString = "cd " + protectedDirectory + "/" + currentEntry.buildName + "\n"
        // getting the imageDateTag depends on the web version existing on disk which it will because it is compiled before the other components
        + "imageDateTag=$(unzip -p $(echo " + serviceName + ".war | sed \"s/_admin.war/_web.war/g\") version.json | grep compileDate | sed \"s/[^0-9]//g\")\n"
        // 2024-04-03 removing the --no-cache does not have much affect on the build times so we keep it in. Although it probably isn't needed because the WAR file mtime should have changed.
        + "sudo docker build --force-rm --no-cache -f " + serviceName + ".Docker -t " + dockerRegistry + "/" + serviceName + ":$imageDateTag .\n"
        // + "docker tag " + serviceName + " " + dockerRegistry + "/" + serviceName + ":$imageDateTag \n"
        + "sudo docker push " + dockerRegistry + "/" + serviceName + ":$imageDateTag \n"
        + "sudo docker service rm " + serviceName + " || true\n" // this might not be a smooth transition to rm first, but at this point we do not know if there is an existing service to use service update
        + "sudo docker service create --name " + serviceName + " " + dockerServiceOptions + " -d -p 8080 " + dockerRegistry + "/" + serviceName + ":$imageDateTag\n"
        + "sudo docker system prune -f\n";
    try {
        // console.log(serviceSetupString);
        // TODO: this need not be a syncronous step only the update and trigger need to be done in a result promise
        child_process.execSync(serviceSetupString, { stdio: [0, 1, 2] });
        console.log("deployDockerService " + serviceName + " finished");
        // storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">DockerService</a>', "production", "admin", false, false, false);
        // TODO: while we could store the service information in a JSON file: docker service ls --format='{{json .Name}}, {{json .Ports}}' it would be better to use docker service ls and translate that into JSON for all of the sevices at once.
        syncFileToSwarmNodes(dockerFilePath);
        updateServicesJson();
        triggerProxyUpdate();
    } catch (error) {
        console.error("deployDockerService " + serviceName + " error:" + error);
        // storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">DockerService error</a>', "production", "admin", true, false, true);
    }
}

function deployStagingGui(currentEntry) {
    console.log("deployStagingGui");
    syncDeleteFromSwarmNodes(currentEntry.buildName, "staging");
    // gtwBuildingCount++;
    var stageStartTime = new Date().getTime();
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">building</a>', "staging", "web", false, true, false);
    var queuedConfigFile = path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml');
    var stagingConfigFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '.xml');
    if (!fs.existsSync(queuedConfigFile)) {
        console.log("deployStagingGui missing: " + queuedConfigFile);
        storeResult(currentEntry.buildName, 'failed', "staging", "web", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
        // gtwBuildingCount--;
    } else {
        if (fs.existsSync(stagingConfigFile)) {
            console.log("deployStagingGui found: " + stagingConfigFile);
            console.log("deployStagingGui if another process already building it will be terminated: " + currentEntry.buildName);
            fs.unlinkSync(stagingConfigFile);
        }
        // this move is within the same volume so we can do it this easy way
        fs.renameSync(queuedConfigFile, stagingConfigFile);
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_staging_web';
        var dockerString = 'sudo docker container rm -f ' + buildContainerName
            + " &> /dev/null;"// + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + 'sudo docker run'
            + ' --rm '
            + buildContainerOptions
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v protectedDirectory:' + protectedDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
            + ' /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
            //+ " sed -i 's/-Xmx1g/-Xmx4g/g' pom.xml;"
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + ((currentEntry.state === "draft") ? " sed -i 's|<extraJvmArgs>|<draftCompile>true</draftCompile><style>DETAILED</style><extraJvmArgs>|g' pom.xml;" : '')
            + ((currentEntry.state === "draft") ? " sed -i 's|<source|<collapse-all-properties /><source|g' src/main/resources/nl/mpi/tg/eg/ExperimentTemplate.gwt.xml;" : '')
            + ' mvn clean '
            + ((currentEntry.isWebApp && (deploymentType.includes('staging_tomcat') || ( /* limiting tomcat deployments to when a server is specified */ currentEntry.stagingServer != null && currentEntry.stagingServer.length > 0))) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            //+ ' -pl gwt-cordova'
            + ((currentEntry.state === "debug") ? ' -Dgwt.draftCompile=true -Dgwt.style=DETAILED -Dgwt.extraJvmArgs="-Xmx1024m"' : '')
            // + ' -Dgwt.extraJvmArgs="-Xmx8g"'
            // + ' -Dgwt.localWorkers=12'
            + ' -q -Dgwt.logLevel=WARN' // ERROR, WARN, INFO, TRACE, DEBUG, SPAM or ALL (defaults to INFO)
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -Dexperiment.configuration.informReadyUrl=' + proxyUpdateTrigger
            // + ' -DversionCheck.buildType=' + 'stable'
            // TODO: usage of currentEntry.stagingServer is not implemented for targeting tomcat deployments nor undeployments, it is currently only used to tell the GUI application where its URL is for websockets and mobile apps
            + ((currentEntry.stagingServer != null && currentEntry.stagingServer.length > 0) ?
                ' -Dexperiment.destinationServer=' + currentEntry.stagingServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.destinationServerUrl=' + currentEntry.stagingServer
                + ' -Dexperiment.groupsSocketUrl=ws://' + currentEntry.stagingServer.replace(/^https?:\/\//, '')
                : ' -Dexperiment.destinationServer=' + stagingServer
                + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
                + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            )
            // + ' -Dexperiment.destinationServer=' + stagingServer 
            // + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl 
            // + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            + ' -Dexperiment.isScalable=' + currentEntry.isScalable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.configuration.defaultLocale=' + currentEntry.defaultLocale
            + ' -Dexperiment.configuration.availableLocales=' + currentEntry.availableLocales
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            // deleting slf4j-simple which prevents the application starting up
            + ' zip -d /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war WEB-INF/lib/slf4j-simple-1.7.36.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' free -h &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;'
            // skipping electron and cordova if this is a draft build
            + ((currentEntry.state === "draft" || currentEntry.frinexVersion === "snapshot") ? "" : ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-*-cordova.zip /FrinexBuildService/processing/staging-building/'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-*-electron.zip /FrinexBuildService/processing/staging-building/'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-cordova.sh'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-electron.sh'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-*-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web_sources.jar'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' chmod 774 /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-*.sh;'
                + ' chmod 774 /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*;')
            // end of skipping electron and cordova if this is a draft build
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_web.war'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war ' + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + " chmod 774 -R " + targetDirectory + "/" + currentEntry.buildName + "/;"
            + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' echo "build complete" &>> ' + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + '"';
        console.log(dockerString);
        child_process.exec(dockerString, (error, stdout, stderr) => {
            // gtwBuildingCount--;
            if (error) {
                console.error(`deployStagingGui error: ${error}`);
            }
            console.log(`deployStagingGui stdout: ${stdout}`);
            if (stderr) {
                console.error(`deployStagingGui stderr: ${stderr}`);
            }
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_web.war")) {
                if (currentEntry.isWebApp && deploymentType.includes('docker')) {
                    deployDockerService(currentEntry, currentEntry.buildName + '_staging_web.war', currentEntry.buildName + '_staging_web', currentEntry.buildName);
                }
                console.log("deployStagingGui finished");
                var browseLabel = ((currentEntry.state === "staging" || currentEntry.state === "production")) ? "browse" : currentEntry.state;
                var browseLink = (currentEntry.isWebApp) ? '<a href="' + stagingServerUrl + '/' + currentEntry.buildName + '">' + browseLabel + '</a>&nbsp;<a href="' + stagingServerUrl + '/' + currentEntry.buildName + '/TestingFrame.html">robot</a>' : '';
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war">download</a>&nbsp;' + browseLink, "staging", "web", false, false, true, new Date().getTime() - stageStartTime);
                var buildArtifactsJson = { artifacts: {} };
                const buildArtifactsFileName = processingDirectory + '/staging-building/' + currentEntry.buildName + '_staging_artifacts.json';
                syncFileToSwarmNodes(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web_sources.jar '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war '
                    + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt; ');
                if (currentEntry.state === "staging" || currentEntry.state === "production") {
                    //        var successFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                    //        successFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(value, null, 4));
                    //        console.log(targetDirectory);
                    //        console.log(value);
                    buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_staging_web.war";
                    // update artifacts.json
                    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
                    // build cordova 
                    if (currentEntry.isAndroid || currentEntry.isiOS) {
                        buildApk(currentEntry, "staging", buildArtifactsJson, buildArtifactsFileName);
                    }
                    if (currentEntry.isDesktop) {
                        buildElectron(currentEntry, "staging", buildArtifactsJson, buildArtifactsFileName);
                    }
                    if (currentEntry.isVirtualReality) {
                        buildVirtualReality(currentEntry, "staging", buildArtifactsJson, buildArtifactsFileName);
                    }
                    // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
                    deployStagingAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
                } else if (currentEntry.state === "debug") {
                    // the admin will be built with additional logging in the docker service while android and desktop versions are skipped
                    deployStagingAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
                } else {
                    if (fs.existsSync(stagingConfigFile)) {
                        fs.unlinkSync(stagingConfigFile);
                    }
                    currentlyBuilding.delete(currentEntry.buildName);
                }
            } else {
                //console.log(targetDirectory);
                //console.log(JSON.stringify(reason, null, 4));
                console.log("deployStagingGui failed: " + currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt?' + new Date().getTime() + '">failed</a>', "staging", "web", true, false, false);
                //var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                //errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
                if (fs.existsSync(stagingConfigFile)) {
                    fs.unlinkSync(stagingConfigFile);
                }
                // buildArtifactsFileName should not exist at this point
                currentlyBuilding.delete(currentEntry.buildName);
            }
            var cordovaSetupFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '_setup-cordova.sh');
            if (fs.existsSync(cordovaSetupFile)) {
                fs.unlinkSync(cordovaSetupFile);
            }
            var electronSetupFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '_setup-electron.sh');
            if (fs.existsSync(electronSetupFile)) {
                fs.unlinkSync(electronSetupFile);
            }
            /* this file is deleted at the start of the admin build process
            var cordovaZipFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '-frinex-gui-*-cordova.zip');
            if (fs.existsSync(cordovaZipFile)) {
                fs.unlinkSync(cordovaZipFile);
            }*/
            /* this file is deleted at the start of the admin build process
            var electronZipFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '-frinex-gui-*-electron.zip');
            if (fs.existsSync(electronZipFile)) {
                fs.unlinkSync(electronZipFile);
            }*/
        });
    }
}

function deployStagingAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">building</a>', "staging", "admin", false, true, false);
    var stagingConfigFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '.xml');
    //    var stagingAdminConfigFile = path.resolve(processingDirectory + '/staging-admin', currentEntry.buildName + '.xml');
    if (!fs.existsSync(stagingConfigFile)) {
        console.log("deployStagingAdmin missing: " + stagingConfigFile);
        storeResult(currentEntry.buildName, 'failed', "staging", "admin", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
    } else {
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_staging_admin';
        var dockerString = 'sudo docker container rm -f ' + buildContainerName
            + " &> /dev/null;"//+ " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + buildContainerOptions
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v protectedDirectory:' + protectedDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
            + ' /bin/bash -c "cd /ExperimentTemplate/registration;'
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
            + ' -Dexperiment.isScalable=' + currentEntry.isScalable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + ' -Dexperiment.configuration.informReadyUrl=' + proxyUpdateTrigger
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            // + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-*.war ' + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' mv /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-*-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' chmod 774 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
            + ' chmod 774 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
            + ' echo "build complete" &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt;'
            + '"';
        console.log(dockerString);
        try {
            child_process.execSync(dockerString, { stdio: [0, 1, 2] });
            if (fs.existsSync(protectedDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.war")) {
                // The 1.3-audiofix build image is so old that it cannot be run in the Docker swarm. If future support is needed then the stable image should instead be used to build 1.3-audiofix admin applications
                if (deploymentType.includes('docker') && currentEntry.frinexVersion !== "1.3-audiofix") {
                    deployDockerService(currentEntry, currentEntry.buildName + '_staging_admin.war', currentEntry.buildName + '_staging_admin', currentEntry.buildName + '-admin');
                }
                console.log("frinex-admin finished");
                var browseLabel = ((currentEntry.state === "staging" || currentEntry.state === "production")) ? "browse" : currentEntry.state;
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar">download</a>&nbsp;<a href="' + stagingServerUrl + '/' + currentEntry.buildName + '-admin">' + browseLabel + '</a>&nbsp;<a href="' + stagingServerUrl + '/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "staging", "admin", false, false, true, new Date().getTime() - stageStartTime);
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_staging_admin_sources.jar";
                // update artifacts.json
                // save the build artifacts JSON to the httpd directory
                const buildArtifactsTargetFileName = targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_artifacts.json';
                fs.writeFileSync(buildArtifactsTargetFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
                syncFileToSwarmNodes(protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt; '
                    + buildArtifactsTargetFileName);
                console.log("deployStagingAdmin ended");
                if (currentEntry.state === "production") {
                    var productionQueuedFile = path.resolve(processingDirectory + '/production-queued', currentEntry.buildName + '.xml');
                    // this move is within the same volume so we can do it this easy way
                    fs.renameSync(stagingConfigFile, productionQueuedFile);
                    deployProductionGui(currentEntry, 3);
                } else {
                    if (fs.existsSync(stagingConfigFile)) {
                        fs.unlinkSync(stagingConfigFile);
                    }
                    currentlyBuilding.delete(currentEntry.buildName);
                }
            } else {
                console.log("deployStagingAdmin failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">failed</a>', "staging", "admin", true, false, false);
                if (fs.existsSync(stagingConfigFile)) {
                    fs.unlinkSync(stagingConfigFile);
                }
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
                currentlyBuilding.delete(currentEntry.buildName);
            };
        } catch (error) {
            console.error('deployStagingAdmin error: ' + error);
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt?' + new Date().getTime() + '">failed</a>', "staging", "admin", true, false, false);
            if (fs.existsSync(stagingConfigFile)) {
                fs.unlinkSync(stagingConfigFile);
            }
            if (fs.existsSync(buildArtifactsFileName)) {
                fs.unlinkSync(buildArtifactsFileName);
            }
            currentlyBuilding.delete(currentEntry.buildName);
        }
    }
}

function deployProductionGui(currentEntry, retryCounter) {
    syncDeleteFromSwarmNodes(currentEntry.buildName, "production");
    var stageStartTime = new Date().getTime();
    // gtwBuildingCount++;
    console.log("deployProductionGui started: " + currentEntry.buildName);
    console.log("retryCounter: " + retryCounter);
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt", 'w'));
    storeResult(currentEntry.buildName, 'checking', "production", "web", false, true, false);
    var productionQueuedFile = path.resolve(processingDirectory + '/production-queued', currentEntry.buildName + '.xml');
    var productionConfigFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '.xml');
    if (!fs.existsSync(productionQueuedFile)) {
        console.log("deployProductionGui missing: " + productionQueuedFile);
        storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
        // gtwBuildingCount--;
    } else {
        var existingDeploymentUrl = ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer : productionServerUrl) + "/" + currentEntry.buildName;
        const buildArtifactsFileName = processingDirectory + '/production-building/' + currentEntry.buildName + '_production_artifacts.json';
        console.log("existing deployment check: " + existingDeploymentUrl);
        try {
            got.get(existingDeploymentUrl, { responseType: 'text', timeout: { request: 3000 } }).then(response => {
                console.log("statusCode: " + response.statusCode);
                console.log("existing frinex-gui production found, aborting build!");
                storeResult(currentEntry.buildName, "existing production found, aborting build!", "production", "web", true, false, false);
                if (fs.existsSync(productionQueuedFile)) {
                    fs.unlinkSync(productionQueuedFile);
                }
                currentlyBuilding.delete(currentEntry.buildName);
                // gtwBuildingCount--;
            }).catch(error => {
                console.log(error.message);
                // if currentEntry.isWebApp is false then the GUI will not be deployed, so we allow the admin to be updated in the next steps
                if (currentEntry.isWebApp && typeof error.response !== 'undefined' && error.response.statusCode !== 404) {
                    console.log("existing frinex-gui production unknown, aborting build: " + currentEntry.buildName);
                    if (fs.existsSync(productionQueuedFile)) {
                        if (retryCounter > 0) {
                            retryCounter--;
                            storeResult(currentEntry.buildName, "retry", "production", "web", false, true, false);
                            deployProductionGui(currentEntry, retryCounter);
                        } else {
                            storeResult(currentEntry.buildName, "network error", "production", "web", true, false, false);
                            fs.unlinkSync(productionQueuedFile);
                            currentlyBuilding.delete(currentEntry.buildName);
                            // gtwBuildingCount--;
                        }
                    } else {
                        storeResult(currentEntry.buildName, "existing production unknown, aborting build!", "production", "web", true, false, false);
                        if (fs.existsSync(productionConfigFile)) {
                            fs.unlinkSync(productionConfigFile);
                        }
                        /*if (fs.existsSync(buildArtifactsFileName)) {
                            fs.unlinkSync(buildArtifactsFileName);
                        }*/
                        currentlyBuilding.delete(currentEntry.buildName);
                        // gtwBuildingCount--;
                    }
                } else {
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">building</a>', "production", "web", false, true, false);
                    if (fs.existsSync(productionConfigFile)) {
                        console.log("deployProductionGui found: " + productionConfigFile);
                        console.log("deployProductionGui if another process already building it will be terminated: " + currentEntry.buildName);
                        fs.unlinkSync(productionConfigFile);
                    }
                    console.log("renameSync: " + productionQueuedFile);
                    // this move is within the same volume so we can do it this easy way
                    fs.renameSync(productionQueuedFile, productionConfigFile);
                    //  terminate existing docker containers by name 
                    var buildContainerName = currentEntry.buildName + '_production_web';
                    var dockerString = 'sudo docker container rm -f ' + buildContainerName
                        + ' &> /dev/null;'//+ " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + 'sudo docker run'
                        + ' --rm '
                        + buildContainerOptions
                        + ' --name ' + buildContainerName
                        /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
                        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
                        + ' -v processingDirectory:/FrinexBuildService/processing'
                        + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
                        //+ ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
                        + ' -v buildServerTarget:' + targetDirectory
                        + ' -v protectedDirectory:' + protectedDirectory
                        + ' -v m2Directory:/maven/.m2/'
                        + ' -w /ExperimentTemplate frinexapps-jdk:'
                        + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
                        + ' /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
                        // delete all test frames.html and other test html that should not make it to production
                        + ' rm /ExperimentTemplate/gwt-cordova/src/main/webapp/*.html;'
                        + ' rm /ExperimentTemplate/gwt-cordova/src/main/webapp/*.js;'
                        + ' rm /ExperimentTemplate/gwt-cordova/src/main/webapp/*.css;'
                        // remove all console.log|error statments that should not make it to production
                        + " sed -i 's|console\.[el][^;]*;||g' /ExperimentTemplate/gwt-cordova/src/main/html/index.html /ExperimentTemplate/gwt-cordova/src/main/java/nl/mpi/tg/eg/experiment/*/*.java /ExperimentTemplate/gwt-cordova/src/main/java/nl/mpi/tg/eg/experiment/client/*/*.java;"
                        // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
                        + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
                        + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
                        + " sed -i 's|<!-- TomcatSedMarkerA -->|<!-- |g' /ExperimentTemplate/gwt-cordova/pom.xml;"
                        + " sed -i 's|<!-- TomcatSedMarkerB -->| -->|g' /ExperimentTemplate/gwt-cordova/pom.xml;"
                        + ' mvn clean '
                        + ((currentEntry.isWebApp && deploymentType.includes('production_tomcat')) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
                        //+ 'package'
                        + ' -gs /maven/.m2/settings.xml'
                        + ' -DskipTests'
                        // + ' -Dlog4j2.version=2.17.2'
                        //+ ' -pl gwt-cordova'
                        + ' -q -Dgwt.logLevel=WARN' // ERROR, WARN, INFO, TRACE, DEBUG, SPAM or ALL (defaults to INFO)
                        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
                        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
                        + ' -Dexperiment.webservice=' + configServer
                        + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
                        + ' -DversionCheck.allowSnapshots=' + 'false'
                        // + ' -DversionCheck.buildType=' + 'stable'
                        + ' -Dexperiment.configuration.defaultLocale=' + currentEntry.defaultLocale
                        + ' -Dexperiment.configuration.availableLocales=' + currentEntry.availableLocales
                        + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                            ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                            + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                            + ' -Dexperiment.groupsSocketUrl=ws://' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                            + ' -Dexperiment.productionCheckString=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                            : ' -Dexperiment.destinationServer=' + productionServer
                            + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
                            + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
                            + ' -Dexperiment.productionCheckString=' + productionServerUrl.replace(/^https?:\/\//, '')
                        )
                        + ' -Dexperiment.isScalable=' + currentEntry.isScalable
                        + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
                        + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        // deleting slf4j-simple which prevents the application starting up
                        + ' zip -d /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war WEB-INF/lib/slf4j-simple-1.7.36.jar'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip /FrinexBuildService/processing/production-building/'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip /FrinexBuildService/processing/production-building/'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-cordova.sh'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-electron.sh'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web_sources.jar'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        //+ ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_web.war'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war ' + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war'
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        //+ ' chmod a+rwx /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production*;'
                        + ' chmod 774 /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-*.sh;'
                        + ' chmod 774 /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*;'
                        + ' chmod 774 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
                        + ' chmod 774 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
                        //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/production-building/'
                        //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' chown -R 101010 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
                        + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
                        + '"';
                    // console.log(dockerString);
                    child_process.exec(dockerString, (error, stdout, stderr) => {
                        // gtwBuildingCount--;
                        if (error) {
                            console.error(`deployProductionGui error: ${error}`);
                        }
                        console.log(`deployProductionGui stdout: ${stdout}`);
                        console.error(`deployProductionGui stderr: ${stderr}`);
                        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_web.war")) {
                            if (currentEntry.isWebApp && deploymentType.includes('docker')) {
                                deployDockerService(currentEntry, currentEntry.buildName + '_production_web.war', currentEntry.buildName + '_production_web', currentEntry.buildName);
                            }
                            console.log("deployProductionGui finished: " + currentEntry.buildName);
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war">download</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer : productionServerUrl) + '/' + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true, new Date().getTime() - stageStartTime);
                            var buildArtifactsJson = { artifacts: {} };
                            buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_production_web.war";
                            // update artifacts.json
                            fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
                            syncFileToSwarmNodes(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web_sources.jar '
                            + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war '
                            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war '
                            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt; ');
                            // build cordova 
                            if (currentEntry.isAndroid || currentEntry.isiOS) {
                                buildApk(currentEntry, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            if (currentEntry.isDesktop) {
                                buildElectron(currentEntry, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            if (currentEntry.isVirtualReality) {
                                buildVirtualReality(currentEntry, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
                            deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
                        } else {
                            //console.log(targetDirectory);
                            //console.log(JSON.stringify(reason, null, 4));
                            console.log("deployProductionGui failed: " + currentEntry.buildName);
                            console.log(currentEntry.experimentDisplayName);
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt?' + new Date().getTime() + '">failed</a>', "production", "web", true, false, false);
                            //var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_production.html", {flags: 'w'});
                            //errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
                            if (fs.existsSync(productionConfigFile)) {
                                fs.unlinkSync(productionConfigFile);
                            }
                            // buildArtifactsFileName should not exist at this point
                            currentlyBuilding.delete(currentEntry.buildName);
                        }
                        var cordovaSetupFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '_setup-cordova.sh');
                        if (fs.existsSync(cordovaSetupFile)) {
                            fs.unlinkSync(cordovaSetupFile);
                        }
                        var electronSetupFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '_setup-electron.sh');
                        if (fs.existsSync(electronSetupFile)) {
                            fs.unlinkSync(electronSetupFile);
                        }
                        /* this file is deleted at the start of the admin build process
                        var cordovaZipFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '-frinex-gui-stable-cordova.zip');
                        if (fs.existsSync(cordovaZipFile)) {
                            fs.unlinkSync(cordovaZipFile);
                        }*/
                        /* this file is deleted at the start of the admin build process
                        var electronZipFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '-frinex-gui-stable-electron.zip');
                        if (fs.existsSync(electronZipFile)) {
                            fs.unlinkSync(electronZipFile);
                        }*/
                    });
                }
            });
        } catch (exception) {
            console.error(exception);
            console.error("frinex-gui production failed: " + currentEntry.buildName);
            storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
            if (fs.existsSync(productionConfigFile)) {
                fs.unlinkSync(productionConfigFile);
            }
            if (fs.existsSync(buildArtifactsFileName)) {
                fs.unlinkSync(buildArtifactsFileName);
            }
            currentlyBuilding.delete(currentEntry.buildName);
            // gtwBuildingCount--;
        }
    }
}

function deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">building</a>', "production", "admin", false, true, false);
    var productionConfigFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '.xml');
    //    var productionAdminConfigFile = path.resolve(processingDirectory + '/production-admin', currentEntry.buildName + '.xml');
    if (!fs.existsSync(productionConfigFile)) {
        console.log("deployProductionAdmin missing: " + productionConfigFile);
        storeResult(currentEntry.buildName, 'failed', "production", "admin", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
    } else {
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_production_admin';
        var dockerString = 'sudo docker container rm -f ' + buildContainerName
            + ' &> /dev/null;'//+ " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + buildContainerOptions
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v protectedDirectory:' + protectedDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps-jdk:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
            + ' /bin/bash -c "cd /ExperimentTemplate/registration;'
            // using sed to replace the deprecated DB URL in very old build images like 1.3-audiofix
            + " sed -i 's|localhost:5432|" + productionDbHost + "|g' /ExperimentTemplate/registration/src/main/resources/application.properties;"
            + ' rm /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip;'
            + ' rm /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip;'
            + ' rm /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*-stable-vr.zip;'
            + ' mkdir ' + targetDirectory + '/' + currentEntry.buildName + '/included_artifacts/;'
            + ' ls -l ' + targetDirectory + '/' + currentEntry.buildName + ' &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt;'
            // using sed to replace the destinationServerUrl with destinationServer for older build images, new build images did not need this but since the addition of the proxy it is now required for all
            + " sed -i 's|>\\${experiment.destinationServer}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|>\\${experiment.destinationServerUrl}/manager/text|>https://\\${experiment.destinationServer}/manager/text|g' /ExperimentTemplate/pom.xml;"
            + " sed -i 's|<!-- TomcatSedMarkerA -->|<!-- |g' /ExperimentTemplate/registration/pom.xml;"
            + " sed -i 's|<!-- TomcatSedMarkerB -->| -->|g' /ExperimentTemplate/registration/pom.xml;"
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            + ((/* currentEntry.isWebApp && isWebApp is incorrect, non web apps still need the admin */ deploymentType.includes('production_tomcat')) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            // + ' -Dlog4j2.version=2.17.2'
            //+ ' -pl frinex-admin'
            + ' -q' // quiet output
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
            //  2024-07-18 suppressing the inclusion of the desktop and mobile application artifacts to save server side disk space
            + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/included_artifacts/'
            // + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            // + ' -DversionCheck.buildType=' + 'stable'
            // only use a token for the admin password here so that the passwords do not get stored in the logs
            + ' -Dexperiment.configuration.admin.password=_admin_password_'
            + ' -Dexperiment.configuration.admin.allowDelete=' + ((currentEntry.allowDelete != null) ? currentEntry.allowDelete : 'false')
            + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                + ' -Dexperiment.groupsSocketUrl=ws://' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.productionCheckString=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                // we handle the db host for custom servers which still needs to be localhost by not specifying 
                // the db host so that it defaults to the value in the pom.xml which is localhost:5432
                // otherwise it could be done with:
                //  + ' -Dexperiment.configuration.db.host=' + properties.get(currentEntry.productionServer.replace(/^https?:\/\//, '') + '.dbHost')
                // as an exception to this when the standard production server is specified we still need to set the db.host from the configuration file
                + ((currentEntry.productionServer.includes(productionServer)) ? ' -Dexperiment.configuration.db.host=' + productionDbHost : '')
                : ' -Dexperiment.destinationServer=' + productionServer
                + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
                + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
                + ' -Dexperiment.productionCheckString=' + productionServerUrl.replace(/^https?:\/\//, '')
                + ' -Dexperiment.configuration.db.host=' + productionDbHost
            )
            + ' -Dexperiment.isScalable=' + currentEntry.isScalable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable.war ' + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' mv /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' chmod 774 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
            + ' chmod 774 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + protectedDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + '"';
        // console.log(dockerString);
        try {
            // after the log has been written replace the token with the admin password
            child_process.execSync(dockerString.replace("_admin_password_", getExperimentToken(currentEntry.buildName)), { stdio: [0, 1, 2] });
            if (fs.existsSync(protectedDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.war")) {
                // The 1.3-audiofix build image is so old that it cannot be run in the Docker swarm. If future support is needed then the stable image should instead be used to build 1.3-audiofix admin applications
                if (deploymentType.includes('docker') && (currentEntry.productionServer == null || currentEntry.productionServer.length == 0) && currentEntry.frinexVersion !== "1.3-audiofix") {
                    deployDockerService(currentEntry, currentEntry.buildName + '_production_admin.war', currentEntry.buildName + '_production_admin', currentEntry.buildName + '-admin');
                }
                console.log("frinex-admin finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">log</a>&nbsp;<a href="/cgi/experiment_access.cgi?' + currentEntry.buildName + '">access</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar">download</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer : productionServerUrl) + '/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer : productionServerUrl) + '/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "production", "admin", false, false, true, new Date().getTime() - stageStartTime);
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_production_admin_sources.jar";
                // update artifacts.json
                // save the build artifacts JSON to the httpd directory
                const buildArtifactsTargetFileName = targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_artifacts.json';
                fs.writeFileSync(buildArtifactsTargetFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
                if (fs.existsSync(productionConfigFile)) {
                    fs.unlinkSync(productionConfigFile);
                }
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
                currentlyBuilding.delete(currentEntry.buildName);
                syncFileToSwarmNodes(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar '
                    + protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war '
                    + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt; '
                    + buildArtifactsTargetFileName);
            } else {
                console.log("deployProductionAdmin failed");
                console.log(currentEntry.experimentDisplayName);
                if (fs.existsSync(productionConfigFile)) {
                    fs.unlinkSync(productionConfigFile);
                }
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
                currentlyBuilding.delete(currentEntry.buildName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">failed</a>', "production", "admin", true, false, false);
            };
            //currentlyBuilding.delete(currentEntry.buildName);
        } catch (error) {
            console.error('deployProductionAdmin error: ' + error);
            if (fs.existsSync(productionConfigFile)) {
                fs.unlinkSync(productionConfigFile);
            }
            if (fs.existsSync(buildArtifactsFileName)) {
                fs.unlinkSync(buildArtifactsFileName);
            }
            currentlyBuilding.delete(currentEntry.buildName);
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt?' + new Date().getTime() + '">failed</a>', "production", "admin", true, false, false);
        }
        console.log("deployProductionAdmin ended");
    }
}

function buildApk(currentEntry, stage, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    console.log("starting cordova build");
    storeResult(currentEntry.buildName, "building", stage, "android", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_android.txt")) {
            fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_android.txt");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_android.txt", 'w'));
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_android.txt?" + new Date().getTime() + '">log</a>&nbsp;';
        storeResult(currentEntry.buildName, "building " + resultString, stage, "android", false, true, false);
        // the mvn target directory is not in the docker volume so that the build process does not cause redundant file synchronisation across the docker volume.
        var dockerString = 'sudo docker container rm -f ' + currentEntry.buildName + '_' + stage + '_cordova'
            + ' &> /dev/null;'// ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' sudo docker run --name ' + currentEntry.buildName + '_' + stage + '_cordova --rm '
            + buildContainerOptions
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:' + targetDirectory
            + ' frinexapps-cordova:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
            + ' /bin/bash -c "'
            + ' mkdir /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '_setup-cordova.sh /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' bash /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '_setup-cordova.sh &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' ls /FrinexBuildService/cordova-' + stage + '-build/* &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/app-release.apk ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.apk &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/app-release.aab ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.aab &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-android.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-ios.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_ios.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' chmod 774 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + '"';
        // console.log(dockerString);
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        syncFileToSwarmNodes(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.apk '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.aab '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_ios.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt; ');
    } catch (reason) {
        console.error(reason);
        resultString += 'failed&nbsp;';
        hasFailed = true;
    }
    // check for build products and add links to the output JSON
    var producedOutput = false;
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_cordova.apk")) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_cordova.apk" + '">apk</a>&nbsp;';
        buildArtifactsJson.artifacts.apk = currentEntry.buildName + "_" + stage + "_cordova.apk";
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_cordova.aab")) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_cordova.aab" + '">aab</a>&nbsp;';
        buildArtifactsJson.artifacts.aab = currentEntry.buildName + "_" + stage + "_cordova.aab";
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_cordova.zip")) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_cordova.zip" + '">src</a>&nbsp;';
    }
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_android.zip")) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_android.zip" + '">android-src</a>&nbsp;';
        buildArtifactsJson.artifacts.apk_src = currentEntry.buildName + "_" + stage + "_android.zip";
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_ios.zip")) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_ios.zip" + '">ios-src</a>&nbsp;';
        buildArtifactsJson.artifacts.ios_src = currentEntry.buildName + "_" + stage + "_ios.zip";
        producedOutput = true;
    }
    //add the XML and any json + template and any UML of the experiment to the buildArtifactsJson of the admin system
    console.log("build cordova finished");
    var isError = hasFailed || !producedOutput;
    storeResult(currentEntry.buildName, resultString, stage, "android", isError, isError /* preventing skipped indicators */, true, new Date().getTime() - stageStartTime);
    //update artifacts.json
    //const buildArtifactsFileName = processingDirectory + '/' + stage + '-building/' + currentEntry.buildName + "_" + stage + '_artifacts.json';
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
}

function buildElectron(currentEntry, stage, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    console.log("starting electron build");
    storeResult(currentEntry.buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_electron.txt")) {
            fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_electron.txt");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_electron.txt", 'w'));
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_electron.txt?" + new Date().getTime() + '">log</a>&nbsp;';
        storeResult(currentEntry.buildName, "building " + resultString, stage, "desktop", false, true, false);
        var dockerString = 'sudo docker container rm -f ' + currentEntry.buildName + '_' + stage + '_electron'
            + ' &> /dev/null;'// ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + 'sudo docker run --name ' + currentEntry.buildName + '_' + stage + '_electron --rm '
            + buildContainerOptions
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:' + targetDirectory
            + ' frinexapps-electron:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'stable')
            + ' /bin/bash -c "'
            + ' mkdir /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '_setup-electron.sh /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip /FrinexBuildService/electron-' + stage + '-build/ &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' bash /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '_setup-electron.sh &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' ls /FrinexBuildService/electron-' + stage + '-build/* &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-win32-ia32.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-ia32.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-win32-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-darwin-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            // copy the electron online only versions
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-win32-x64-lt.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64-lt.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-darwin-x64-lt.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64-lt.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-linux-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_linux-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' chmod 774 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + ' chown -R 101010 ' + targetDirectory + '/' + currentEntry.buildName + '/;'
            + '"';
        // console.log(dockerString);
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        syncFileToSwarmNodes(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64-lt.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64-lt.zip '
            + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt; ');
        //resultString += "built&nbsp;";
    } catch (reason) {
        console.error(reason);
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    var producedOutput = false;
    // update the links and artifacts JSON
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip">src</a>&nbsp;';
        buildArtifactsJson.artifacts['src'] = currentEntry.buildName + '_' + stage + '_electron.zip';
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-ia32.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-ia32.zip">win32</a>&nbsp;';
        buildArtifactsJson.artifacts['win32'] = currentEntry.buildName + '_' + stage + '_win32-ia32.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip">win64</a>&nbsp;';
        buildArtifactsJson.artifacts['win64'] = currentEntry.buildName + '_' + stage + '_win32-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip">mac</a>&nbsp;';
        buildArtifactsJson.artifacts['mac'] = currentEntry.buildName + '_' + stage + '_darwin-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_linux-x64.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '_' + stage + '_linux-x64.zip">linux</a>&nbsp;';
        buildArtifactsJson.artifacts['linux'] = currentEntry.buildName + '_' + stage + '_linux-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64-lt.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64-lt.zip">win64-lt</a>&nbsp;';
        buildArtifactsJson.artifacts['win64'] = currentEntry.buildName + '_' + stage + '_win32-x64-lt.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64-lt.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64-lt.zip">mac-lt</a>&nbsp;';
        buildArtifactsJson.artifacts['mac'] = currentEntry.buildName + '_' + stage + '_darwin-x64-lt.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_linux-x64-lt.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '_' + stage + '_linux-x64-lt.zip">linux-lt</a>&nbsp;';
        buildArtifactsJson.artifacts['linux'] = currentEntry.buildName + '_' + stage + '_linux-x64-lt.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '.asar')) {
        resultString += '<a href="' + currentEntry.buildName + '_' + stage + '.asar">asar</a>&nbsp;';
        buildArtifactsJson.artifacts['asar'] = currentEntry.buildName + '_' + stage + '.asar';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '.dmg')) {
        resultString += '<a href="' + currentEntry.buildName + '_' + stage + '.dmg">dmg</a>&nbsp;';
        buildArtifactsJson.artifacts['dmg'] = currentEntry.buildName + '_' + stage + '.dmg';
        producedOutput = true;
    }
    //mkdir /srv/target/electron
    //cp out/make/*linux*.zip ../with_stimulus_example-linux.zip
    //cp out/make/*win32*.zip ../with_stimulus_example-win32.zip
    //cp out/make/*darwin*.zip ../with_stimulus_example-darwin.zip
    console.log("build electron finished");
    var isError = hasFailed || !producedOutput;
    storeResult(currentEntry.buildName, resultString, stage, "desktop", isError, isError /* preventing skipped indicators */, true, new Date().getTime() - stageStartTime);
    //  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
}

function buildVirtualReality(currentEntry, stage, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    console.log("starting VR build");
    storeResult(currentEntry.buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_vr.txt")) {
            fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_vr.txt");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_vr.txt", 'w'));
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_vr.txt?" + new Date().getTime() + '">log</a>&nbsp;';
        // TODO: this will overwrite previous "desktop" column data, a new column needs to be added to the build page for "virtualreality"
        storeResult(currentEntry.buildName, "building " + resultString, stage, "desktop", false, true, false);

        console.log("TODO: build VR");
        // mount static files and the XML
        // rename artifacts zip and log to the mounted output folder

        var dockerString = 'sudo docker container rm -f ' + currentEntry.buildName + '_' + stage + '_vr'
         + ' &> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_vr.txt;'
        + '"';
        // console.log(dockerString);
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        //resultString += "built&nbsp;";
    } catch (reason) {
        console.error(reason);
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    var producedOutput = false;

    if (fs.existsSync(targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_vr.zip')) {
        resultString += '<a href="' + currentEntry.buildName + '_' + stage + '_vr.zip">vr</a>&nbsp;';
        buildArtifactsJson.artifacts['vr'] = currentEntry.buildName + '_' + stage + '_vr.zip';
        producedOutput = true;
    }
    console.log("build VR finished");
    var isError = hasFailed || !producedOutput;
    // TODO: this will overwrite previous "desktop" column data, a new column needs to be added to the build page for "virtualreality"
    storeResult(currentEntry.buildName, resultString, stage, "desktop", isError, isError /* preventing skipped indicators */, true, new Date().getTime() - stageStartTime);
    //  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o774 });
}

function buildNextExperiment() {
    while (listingMap.size > 0 && currentlyBuilding.size < concurrentBuildCount /*  && gtwBuildingCount < 1 */) {
        const currentKey = listingMap.keys().next().value;
        console.log('buildNextExperiment: ' + currentKey);
        // console.log('gtwBuildingCount: ' + gtwBuildingCount);
        //fs.writeSync(resultsFile, "buildNextExperiment: " + currentKey + "</div>");
        const currentEntry = listingMap.get(currentKey);
        if (currentlyBuilding.has(currentEntry.buildName)) {
            console.log("waiting rebuild: " + currentEntry.buildName);
            storeResult(currentKey, 'waiting rebuild', "staging", "web", false, false, false); // because the background colour does not get changed here, this entry will get cleared based on its string content when the script restarts after a failure
        } else {
            currentlyBuilding.set(currentEntry.buildName, currentEntry);
            listingMap.delete(currentKey);
            //console.log("starting generate stimulus");
            //child_process.execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
            if (currentEntry.state === "draft" || currentEntry.state === "debug" || currentEntry.state === "staging" || currentEntry.state === "production") {
                deployStagingGui(currentEntry);
            } else if (currentEntry.state === "undeploy") {
                // todo: undeploy probably does not need to be limited by concurrentBuildCount
                unDeploy(currentEntry);
            } else if (currentEntry.state === "transfer") {
                // delete the .commit file in the protected directory to allow transfer of control to an other repository
                // fs.unlinkSync(protectedDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + ".xml.commit");
                syncDeleteFromSwarmNodes(currentEntry.buildName, "transfer");
                storeResult(currentEntry.buildName, 'transferred', "staging", "web", false, false, false);
                currentlyBuilding.delete(currentEntry.buildName);
            } else {
                console.log("nothing to do for: " + currentEntry.buildName);
                currentlyBuilding.delete(currentEntry.buildName);
                fs.unlinkSync(path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml'));
            }
        }
    }
}

function processBuildEntry(filenameL, buildNameL, listingFileL) {
    console.log('filenameL: ' + filenameL);
    console.log('buildNameL: ' + buildNameL);
    console.log('listingFileL: ' + listingFileL);
    // keeping the listing entry in a map so only one can exist for any experiment regardless of mid compilation rebuild requests
    console.log('jsonListing: ' + buildNameL);
    //fs.writeSync(resultsFile, "<div>jsonListing: " + buildNameL + "</div>");
    var listingJsonData = JSON.parse(fs.readFileSync(listingFileL, 'utf8'));
    listingJsonData.buildName = buildNameL;
    console.log('listingJsonData: ' + JSON.stringify(listingJsonData));
    fs.unlinkSync(listingFileL);
    // check that the requested frinex version exists
    if (listingJsonData.frinexVersion != null && listingJsonData.frinexVersion.length > 0 && !availableImageList.includes(listingJsonData.frinexVersion)) {
        console.error("Invalid version: " + listingJsonData.frinexVersion);
        storeResult(buildNameL, "Invalid Version", "validation", "json_xsd", true, false, false);
        console.log('removing: ' + processingDirectory + '/staging-queued' + filenameL);
        fs.unlinkSync(path.resolve(processingDirectory + '/staging-queued', filenameL));
        listingMap.delete(buildNameL);
    } else {
        listingMap.set(buildNameL, listingJsonData);
        storeResult(buildNameL, '', "staging", "web", false, false, false);
        storeResult(buildNameL, '', "staging", "admin", false, false, false);
        storeResult(buildNameL, '', "staging", "android", false, false, false);
        storeResult(buildNameL, '', "staging", "desktop", false, false, false);
        storeResult(buildNameL, '', "production", "target", false, false, false);
        storeResult(buildNameL, ((listingJsonData.frinexVersion != null && listingJsonData.frinexVersion.length > 0) ? listingJsonData.frinexVersion : 'stable'), "frinex", "version", false, false, false);
        storeResult(buildNameL, '', "production", "web", false, false, false);
        storeResult(buildNameL, '', "production", "admin", false, false, false);
        storeResult(buildNameL, '', "production", "android", false, false, false);
        storeResult(buildNameL, '', "production", "desktop", false, false, false);
        if (listingJsonData.state === "staging" || listingJsonData.state === "production") {
            storeResult(listingJsonData.buildName, 'queued', "staging", "web", false, false, false);
            storeResult(listingJsonData.buildName, 'queued', "staging", "admin", false, false, false);
            if (listingJsonData.isAndroid) {
                storeResult(listingJsonData.buildName, 'queued', "staging", "android", false, false, false);
            }
            if (listingJsonData.isDesktop) {
                storeResult(listingJsonData.buildName, 'queued', "staging", "desktop", false, false, false);
            }
        }
        if (listingJsonData.state === "production") {
            storeResult(listingJsonData.buildName, 'queued', "production", "web", false, false, false);
            storeResult(listingJsonData.buildName, 'queued', "production", "admin", false, false, false);
            if (listingJsonData.isAndroid) {
                storeResult(listingJsonData.buildName, 'queued', "production", "android", false, false, false);
            }
            if (listingJsonData.isDesktop) {
                storeResult(listingJsonData.buildName, 'queued', "production", "desktop", false, false, false);
            }
            if (listingJsonData.productionServer != null && listingJsonData.productionServer.length > 0) {
                storeResult(buildNameL, listingJsonData.productionServer, "production", "target", false, false, false);
            } else {
                storeResult(buildNameL, productionServerUrl, "production", "target", false, false, false);
            }
        }
    }
}

function processBuildEntryDB(filenameL, buildNameL, listingFileL) {
    got.get("http://frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_" + buildNameL + "_db", { responseType: 'text' }).then(response => {
        console.log("frinex_db_manager: " + buildNameL + " : " + response.statusCode);
        processBuildEntry(filenameL, buildNameL, listingFileL);
    }).catch(error => {
        console.log("frinex_db_manager: " + buildNameL + " : " + error);
        storeResult(buildNameL, "DB failed", "staging", "web", true, false, false);
        console.log('removing: ' + processingDirectory + '/staging-queued' + filenameL);
        // remove the build entry because the DB creation failed
        fs.unlinkSync(path.resolve(processingDirectory + '/staging-queued', filenameL));
        listingMap.delete(buildNameL);
    });
}

function buildFromListing() {
    var list = fs.readdirSync(processingDirectory + '/queued');
    if (list.length <= 0) {
        //console.log('buildFromListing found no files');
    } else {
        for (var filename of list) {
            console.log('buildFromListing: ' + filename);
            //console.log(path.extname(filename));
            var fileNamePart = path.parse(filename).name;
            if (fileNamePart === "multiparticipant") {
                storeResult(fileNamePart, 'disabled', "validation", "json_xsd", true, false, false);
                console.log("this script will not build multiparticipant without manual intervention");
                fs.unlinkSync(path.resolve(processingDirectory + '/queued', filename));
            } else if (path.extname(filename) === ".lock") {
                console.log("skipping locked file: " + filename);
            } else {
                var validationMessage = "";
                console.log(filename);
                var buildName = fileNamePart;
                console.log(buildName);
                var withoutSuffixPath = path.resolve(targetDirectory + '/' + fileNamePart, fileNamePart);
                console.log('withoutSuffixPath: ' + withoutSuffixPath);
                if (fs.existsSync(withoutSuffixPath + ".json")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.json">json</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (fs.existsSync(withoutSuffixPath + ".svg")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.svg">uml</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (fs.existsSync(withoutSuffixPath + ".uml")) {
                    //validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.uml">uml</a>&nbsp;';
                    //storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (path.extname(filename) === ".xml") {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.xml">xml</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (fs.existsSync(withoutSuffixPath + "_validation_error.txt")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '_validation_error.txt?' + new Date().getTime() + '">failed</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", true, false, false);
                    console.log('removing: ' + processingDirectory + '/validated/' + filename);
                    // remove the processing/validated XML since it will not be built after this point
                    fs.unlinkSync(path.resolve(processingDirectory + '/queued', filename));
                } else {
                    validationMessage += 'passed&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                    if (currentlyBuilding.has(buildName)) {
                        // if any build configuration exists then wait for its build process to terminate
                        console.log('waitingTermination: ' + buildName);
                        fs.writeSync(resultsFile, "<div>waitingTermination: " + buildName + "</div>");
                        storeResult(fileNamePart, 'restarting build', "staging", "web", false, false, false); // because the background colour does not get changed here, this entry will get cleared based on its string content when the script restarts after a failure
                    } else {
                        var listingFile = path.resolve(listingDirectory, buildName + '.json');
                        if (!fs.existsSync(listingFile)) {
                            console.log('listingFile not found: ' + listingFile);
                            fs.writeSync(resultsFile, "<div>listingFile not found: " + listingFile + "</div>");
                            // in this case delete the XML as well
                            fs.unlinkSync(path.resolve(processingDirectory + '/queued', filename));
                        } else {
                            var queuedConfigFile = path.resolve(processingDirectory + '/queued', filename);
                            var stagingQueuedConfigFile = path.resolve(processingDirectory + '/staging-queued', filename);
                            console.log('moving: ' + queuedConfigFile);
                            // this move is within the same volume so we can do it this easy way
                            fs.renameSync(queuedConfigFile, stagingQueuedConfigFile);
                            if (deploymentType.includes('docker')) {
                                processBuildEntryDB(filename, buildName, listingFile);
                            } else {
                                processBuildEntry(filename, buildName, listingFile);
                            }
                        }
                    }
                    // if there is one available then started in the build process before looking for more
                    buildNextExperiment();
                }
            }
        }
    }
    buildNextExperiment();
}

function copyDeleteFile(incomingFile, targetFile) {
    try {
        console.log('locking: ' + incomingFile);
        fs.renameSync(incomingFile, incomingFile + ".lock");
        var incomingReadStream = fs.createReadStream(incomingFile + ".lock");
        incomingReadStream.on('close', function () {
            try {
                if (fs.existsSync(incomingFile + ".lock")) {
                    fs.unlinkSync(incomingFile + ".lock");
                    console.log('removed: ' + incomingFile + ".lock");
                    //fs.writeSync(resultsFile, "<div>removed: " + incomingFile + "</div>");
                }
                /*fs.rename(targetFile + '.tmp', targetFile, function (reason) {
                    if (reason) console.error("copyDeleteFile.tmp failed: " + incomingFile + ":" + targetFile + ":" + reason);
                });*/
            } catch (reason) {
                console.error("copyDeleteFile close failed: " + incomingFile + ":" + targetFile + ":" + reason);
            }
            syncFileToSwarmNodes(targetFile);
        });
        incomingReadStream.pipe(fs.createWriteStream(targetFile, { mode: '774' })); // 0o774 // + '.tmp' at the point of close the destination file is still not accessable for rename.
    } catch (reason) {
        console.error("copyDeleteFile failed: " + incomingFile + ":" + targetFile + ":" + reason);
    }
}

function syncFileToSwarmNodes(fileListString) {
    console.log("sync_file_to_swarm_nodes: " + fileListString);
    try {
        child_process.execSync('bash /FrinexBuildService/script/sync_file_to_swarm_nodes.sh ' + fileListString + ' &>> ' + targetDirectory + '/sync_swarm_nodes.txt;', { stdio: [0, 1, 2] });
    } catch (reason) {
        console.error("sync_file_to_swarm_nodes error");
        console.error(reason);
    }
}

function syncDeleteFromSwarmNodes(buildName, stage) {
    console.log("sync_delete_from_swarm_nodes: " + buildName + " " + stage);
    try {
        child_process.execSync('bash /FrinexBuildService/script/sync_delete_from_swarm_nodes.sh ' + buildName + ' ' + stage + ' &>> ' + targetDirectory + '/sync_swarm_nodes.txt;', { stdio: [0, 1, 2] });
    } catch (reason) {
        console.error("sync_delete_from_swarm_nodes error");
        console.error(reason);
    }
}

function moveToQueued(incomingFile, configQueuedFile, configStoreFile, filename) {
    console.log('moving XML from validated to queued: ' + filename);
    // this move is within the same volume so we can do it this easy way
    fs.renameSync(incomingFile, configQueuedFile + ".lock");
    //fs.writeSync(resultsFile, "<div>copying XML from queued to target: " + filename + "</div>");
    //copyFileSync(incomingFile, configStoreFile);
    //fs.writeSync(resultsFile, "<div>copied XML from validated to queued: " + filename + "</div>");
    console.log('copying XML from queued to target: ' + filename);
    var incomingReadStream = fs.createReadStream(configQueuedFile + ".lock")
    incomingReadStream.on('close', function () {
        console.log('close: ' + configStoreFile);
        fs.renameSync(configQueuedFile + ".lock", configQueuedFile);
        syncFileToSwarmNodes(configStoreFile);
    });
    console.log('configStoreFile: ' + configStoreFile);
    // this move is not within the same volume
    incomingReadStream.pipe(fs.createWriteStream(configStoreFile));
}

function prepareForProcessing() {
    console.log("prepareForProcessing");
    var list = fs.readdirSync(processingDirectory + '/validated');
    for (var filename of list) {
        console.log('processing: ' + filename);
        var fileNamePart = path.parse(filename).name;
        //fs.writeSync(resultsFile, "<div>processing validated: " + filename + "</div>");
        var incomingFile = path.resolve(processingDirectory + '/validated', filename);
        //fs.chmodSync(incomingFile, 0o777); // chmod needs to be done by Docker when the files are created.
        if (filename === "listing.json") {
            console.log('Deprecated listing.json found. Please specify build options in the relevant section of the experiment XML.');
            fs.writeSync(resultsFile, "<div>deprecated listing.json found. Please specify build options in the relevant section of the experiment XML.</div>");
        } else if (path.extname(filename) === ".lock") {
            console.log('skipping lock file: ' + incomingFile);
        } else if (path.extname(filename) === ".json") {
            var jsonStoreFile = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //console.log('incomingFile: ' + incomingFile);
            //console.log('jsonStoreFile: ' + jsonStoreFile);
            //fs.renameSync(incomingFile, jsonStoreFile);
            console.log('moving JSON from validated to target: ' + filename);
            //fs.writeSync(resultsFile, "<div>moving JSON from validated to target: " + filename + "</div>");
            copyDeleteFile(incomingFile, jsonStoreFile);
        } else if (path.extname(filename) === ".xml") {
            //var processingName = path.resolve(processingDirectory, filename);
            // preserve the current XML by copying it to /srv/target which will be accessed via a link in the first column of the results table
            var configStoreFile = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            var configQueuedFile = path.resolve(processingDirectory + "/queued", filename);
            moveToQueued(incomingFile, configQueuedFile, configStoreFile, filename);
        } else if (path.extname(filename) === ".uml") {
            // preserve the generated UML to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            //console.log('copying UML from validated to target: ' + incomingFile);
            //fs.writeSync(resultsFile, "<div>copying UML from validated to target: " + incomingFile + "</div>");
            copyDeleteFile(incomingFile, targetName);
        } else if (path.extname(filename) === ".svg") {
            // preserve the generated UML SVG to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            //console.log('copying SVG from validated to target: ' + filename);
            //fs.writeSync(resultsFile, "<div>copying SVG from validated to target: " + filename + "</div>");
            copyDeleteFile(incomingFile, targetName);
        } else if (path.extname(filename) === ".xsd") {
            // place the generated XSD file for use in XML editors
            var targetName = path.resolve(targetDirectory, filename);
            //console.log('copying XSD from validated to target: ' + filename);
            //fs.writeSync(resultsFile, "<div>copying XSD from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            copyDeleteFile(incomingFile, targetName);
        } else if (filename.endsWith("frinex.html")) {
            // place the generated documentation file for use in web browsers
            var targetName = path.resolve(targetDirectory, filename);
            //console.log('copying HTML from validated to target: ' + filename);
            //fs.writeSync(resultsFile, "<div>copying HTML from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            copyDeleteFile(incomingFile, targetName);
        } else if (filename.endsWith("_validation_error.txt")) {
            var configErrorFile = path.resolve(targetDirectory + "/" + fileNamePart.substring(0, fileNamePart.length - "_validation_error".length), filename);
            console.log('moving from validated to target: ' + filename);
            //fs.writeSync(resultsFile, "<div>copying from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, processingName);
            copyDeleteFile(incomingFile, configErrorFile);
        } else if (fs.existsSync(incomingFile)) {
            console.log('deleting unkown file: ' + incomingFile);
            fs.writeSync(resultsFile, "<div>deleting unkown file: " + incomingFile + "</div>");
            fs.unlinkSync(incomingFile);
        }
    }
    buildFromListing();
}

function checkForDuplicates(incomingFile, filename, currentName) {
    console.log("checkForDuplicates: " + currentName);
    var experimentConfigCounter = 0;
    var experimentConfigLocations = "";
    if (fs.existsSync(incomingFile + ".commit") && fs.existsSync(protectedDirectory + '/' + currentName + '/' + filename + ".commit")) {
        try {
            var commitInfoJson = JSON.parse(fs.readFileSync(incomingFile + ".commit", 'utf8'));
            var storedCommitJson = JSON.parse(fs.readFileSync(protectedDirectory + '/' + currentName + '/' + filename + ".commit"));
            if (commitInfoJson.repository !== storedCommitJson.repository) {
                experimentConfigLocations = "The repository " + commitInfoJson.repository + " cannot build " + currentName + " because it is locked by " + storedCommitJson.repository;
                experimentConfigCounter = 2;
            } else {
                experimentConfigCounter = 1;
            }
        } catch (error) {
            console.log(error);
            experimentConfigLocations = error;
            experimentConfigCounter = 2;
        }
    } else {
        experimentConfigCounter = 1;
    }

    // 2024-07-25 the git checkout directories are no longer kept after triggering the builds so the following section has been replaced by the use of .xml.commit files
    // // iterate all git repositories checking for duplicate files of XML or JSON regardless of case
    // var repositoriesList = fs.readdirSync("/FrinexBuildService/git-checkedout");
    // for (var repositoryDirectory of repositoriesList) {
    //     //console.log(repositoryDirectory);
    //     var repositoryDirectoryPath = path.resolve("/FrinexBuildService/git-checkedout", repositoryDirectory);
    //     var repositoryEntries = fs.readdirSync(repositoryDirectoryPath);
    //     for (var repositoryEntry of repositoryEntries) {
    //         //console.log(repositoryEntry);
    //         var lowercaseEntry = repositoryEntry.toLowerCase();
    //         //console.log(fileNamePart);
    //         if (currentName + ".json" === lowercaseEntry || currentName + ".xml" === lowercaseEntry) {
    //             experimentConfigCounter++;
    //             experimentConfigLocations += repositoryEntry + " found in /git/" + repositoryDirectory + ".git" + "\n";
    //             console.log(repositoryEntry + " found in /git/" + repositoryDirectory + ".git");
    //         }
    //     }
    // }
    // check the wizard working directory for duplicate files of XML or JSON regardless of case
    // var repositoryEntries = fs.readdirSync("/FrinexBuildService/wizard-experiments");
    // for (var wizardEntry of repositoryEntries) {
    //     var lowercaseEntry = wizardEntry.toLowerCase();
    //     if (currentName + ".json" === lowercaseEntry || currentName + ".xml" === lowercaseEntry) {
    //         experimentConfigCounter++;
    //         experimentConfigLocations += wizardEntry + " found in wizard-experiments" + "\n";
    //         console.log(wizardEntry + " found in wizard-experiments");
    //     }
    // }
    var configErrorPath = path.resolve(targetDirectory + "/" + currentName + "/" + currentName + "_conflict_error.txt");
    if (experimentConfigCounter > 1) {
        //console.log(experimentConfigLocations);
        if (!fs.existsSync(targetDirectory + "/" + currentName)) {
            fs.mkdirSync(targetDirectory + "/" + currentName);
            console.log(targetDirectory + "/" + currentName + " directory created");
        }
        const queuedConfigFile = fs.openSync(configErrorPath, "w");
        fs.writeSync(queuedConfigFile, "Multiple configuration files:\n" + experimentConfigLocations);
    } else {
        if (fs.existsSync(configErrorPath)) {
            fs.unlinkSync(configErrorPath);
        }
    }
    return experimentConfigCounter;
}

function moveIncomingToQueued() {
    console.log("moveIncomingToQueued");
    if (!fs.existsSync(incomingDirectory + "/queued")) {
        fs.mkdirSync(incomingDirectory + '/queued');
        console.log('queued directory created');
        //fs.writeSync(resultsFile, "<div>queued directory created</div>");
    }
    if (!fs.existsSync(incomingDirectory + "/prevalidation")) {
        fs.mkdirSync(incomingDirectory + '/prevalidation');
        console.log('prevalidation directory created');
        //fs.writeSync(resultsFile, "<div>prevalidation directory created</div>");
    }
    if (!fs.existsSync(incomingDirectory + "/postvalidation")) {
        fs.mkdirSync(incomingDirectory + '/postvalidation');
        console.log('postvalidation directory created');
        //fs.writeSync(resultsFile, "<div>postvalidation directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/validated")) {
        fs.mkdirSync(processingDirectory + '/validated');
        console.log('validated directory created');
        //fs.writeSync(resultsFile, "<div>validated directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/queued")) {
        fs.mkdirSync(processingDirectory + '/queued');
        console.log('staging directory created');
        //fs.writeSync(resultsFile, "<div>queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/staging-queued")) {
        fs.mkdirSync(processingDirectory + '/staging-queued');
        console.log('staging directory created');
        //fs.writeSync(resultsFile, "<div>staging queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/staging-building")) {
        fs.mkdirSync(processingDirectory + '/staging-building');
        console.log('staging directory created');
        //fs.writeSync(resultsFile, "<div>staging building directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/production-queued")) {
        fs.mkdirSync(processingDirectory + '/production-queued');
        console.log('production directory created');
        //fs.writeSync(resultsFile, "<div>production queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/production-building")) {
        fs.mkdirSync(processingDirectory + '/production-building');
        console.log('production directory created');
        //fs.writeSync(resultsFile, "<div>production building directory created</div>");
    }
    fs.readdir(incomingDirectory + '/commits', function (error, list) {
        if (error) {
            console.error("moveIncomingToQueued error: " + error);
            setTimeout(moveIncomingToQueued, 3000);
        } else {
            var remainingFiles = list.length;
            var foundFilesCount = 0;
            if (remainingFiles <= 0) {
                // check for files in process before exiting from this script 
                var hasProcessingFiles = false;
                var processingList = fs.readdirSync(processingDirectory);
                for (var currentDirectory of processingList) {
                    var currentDirectoryPath = path.resolve(processingDirectory, currentDirectory);
                    var processingList = fs.readdirSync(currentDirectoryPath);
                    if (processingList.length > 0) {
                        hasProcessingFiles = true;
                        console.log('hasProcessingFiles: ' + currentDirectory + ' : ' + processingList.length);
                    }
                }
                if (hasProcessingFiles === true) {
                    // console.log('moveIncomingToQueued: ' + hasProcessingFiles);
                    //fs.writeSync(resultsFile, "<div>has more files in processing</div>");
                    prepareForProcessing();
                    setTimeout(moveIncomingToQueued, 3000);
                } else if (!hasDoneBackup) {
                    // this exit backup process takes too long when a new commit comes in and needs to be built
                    console.log("pre exit backup disabled");
                    /*console.log("pre exit backup");
                    try {
                        child_process.execSync('rsync -a --no-perms --no-owner --no-group --no-times ' + targetDirectory + '/ /BackupFiles/buildartifacts; rsync -a --no-perms --no-owner --no-group --no-times /FrinexBuildService/git-repositories /BackupFiles/ &> ' + targetDirectory + '/backup.log;', { stdio: [0, 1, 2] });
                    } catch (reason) {
                        console.error("check backup.log for messages");
                        console.error(reason);
                    }*/
                    hasDoneBackup = true;
                    setTimeout(moveIncomingToQueued, 3000);
                } else if (waitingServiceStart()) {
                    console.log('waiting on services to start');
                    setTimeout(moveIncomingToQueued, 3000);
                } else {
                    // we allow the process to exit here if there are no files
                    console.log('moveIncomingToQueued: no files');
                    fs.writeSync(resultsFile, "<div>no more files in processing</div>");
                    stopUpdatingResults();
                }
            } else {
                for (var filename of list) {
                    if (foundFilesCount < 6) { // limit the number of files to be validated each time
                        var incomingFile = path.resolve(incomingDirectory + '/commits/', filename);
                        var lowerCaseFileName = filename.toLowerCase();
                        var currentName = path.parse(lowerCaseFileName).name;
                        var queuedFile = path.resolve(incomingDirectory + '/queued/', lowerCaseFileName);
                        if (path.extname(lowerCaseFileName) === ".commit") {
                            console.log(lowerCaseFileName);
                            // the committer info is used when the XML or JSON file is processed
                            if (fs.existsSync(incomingFile)) {
                                // if the .xml.commit file is older than X and there are no other files then it should be deleted
                                fs.stat(incomingFile, function (error, stat) {
                                    if (error) { return console.error(error); }
                                    var currentTime = new Date().getTime();
                                    var deleteTime = new Date(stat.mtime).getTime() + (1000 * 60 * 10) // (10 minutes)
                                    if (currentTime > deleteTime) {
                                        console.log('deleting old: ' + incomingFile);
                                        return fs.unlink(incomingFile, function (error) {
                                            if (error) return console.error(error);
                                        });
                                    }
                                });
                            }
                        } else if (checkForDuplicates(incomingFile, filename, currentName) !== 1) {
                            // the locations of the conflicting configuration files is listed in the error file _conflict_error.txt so we link it here in the message
                            initialiseResult(currentName, '<a class="shortmessage" href="' + currentName + '/' + currentName + '_conflict_error.txt?' + new Date().getTime() + '">conflict<span class="longmessage">Two or more configuration files of the same name exist for this experiment and as a precaution this experiment will not compile until this error is resovled.</span></a>', true, '', '');
                            console.log("this script will not build when two or more configuration files of the same name are found.");
                            fs.writeSync(resultsFile, "<div>conflict: '" + currentName + "'</div>");
                            if (fs.existsSync(incomingFile)) {
                                fs.unlinkSync(incomingFile);
                            }
                            if (fs.existsSync(incomingFile + ".commit")) {
                                fs.unlinkSync(incomingFile + ".commit");
                            }
                        } else if ((path.extname(lowerCaseFileName) === ".json" || path.extname(lowerCaseFileName) === ".xml") && lowerCaseFileName !== "listing.json") {
                            fs.writeSync(resultsFile, "<div>initialise: '" + lowerCaseFileName + "'</div>");
                            console.log('initialise: ' + lowerCaseFileName);
                            if (!fs.existsSync(targetDirectory + "/" + currentName)) {
                                fs.mkdirSync(targetDirectory + '/' + currentName);
                            }
                            if (!fs.existsSync(protectedDirectory + "/" + currentName)) {
                                fs.mkdirSync(protectedDirectory + '/' + currentName);
                            }
                            var mavenLogPathSG = targetDirectory + "/" + currentName + "/" + currentName + "_staging.txt";
                            var mavenLogPathSA = targetDirectory + "/" + currentName + "/" + currentName + "_staging_admin.txt";
                            var mavenLogPathPG = targetDirectory + "/" + currentName + "/" + currentName + "_production.txt";
                            var mavenLogPathPA = targetDirectory + "/" + currentName + "/" + currentName + "_production_admin.txt";
                            var artifactPathSvg = targetDirectory + "/" + currentName + "/" + currentName + ".svg";
                            var artifactPathUml = targetDirectory + "/" + currentName + "/" + currentName + ".uml";
                            var artifactPathJson = targetDirectory + "/" + currentName + "/" + currentName + ".json";
                            var artifactPathXml = targetDirectory + "/" + currentName + "/" + currentName + ".xml";
                            var artifactPathError = targetDirectory + "/" + currentName + "/" + currentName + "_validation_error.txt";
                            if (fs.existsSync(mavenLogPathSG)) {
                                fs.unlinkSync(mavenLogPathSG);
                            }
                            if (fs.existsSync(mavenLogPathSA)) {
                                fs.unlinkSync(mavenLogPathSA);
                            }
                            if (fs.existsSync(mavenLogPathPG)) {
                                fs.unlinkSync(mavenLogPathPG);
                            }
                            if (fs.existsSync(mavenLogPathPA)) {
                                fs.unlinkSync(mavenLogPathPA);
                            }
                            if (fs.existsSync(artifactPathSvg)) {
                                fs.unlinkSync(artifactPathSvg);
                            }
                            if (fs.existsSync(artifactPathUml)) {
                                fs.unlinkSync(artifactPathUml);
                            }
                            if (fs.existsSync(artifactPathJson)) {
                                fs.unlinkSync(artifactPathJson);
                            }
                            if (fs.existsSync(artifactPathXml)) {
                                fs.unlinkSync(artifactPathXml);
                            }
                            if (fs.existsSync(artifactPathError)) {
                                fs.unlinkSync(artifactPathError);
                            }
                            var stagingBuildingConfigFile = path.resolve(processingDirectory + '/staging-building', currentName + '.xml');
                            if (fs.existsSync(stagingBuildingConfigFile)) {
                                console.log("moveIncomingToQueued found: " + stagingBuildingConfigFile);
                                console.log("moveIncomingToQueued if another process already building it will be terminated: " + currentName);
                                fs.unlinkSync(stagingBuildingConfigFile);
                                try {
                                    // note that we dont stop currentName + '_undeploy' because it is probable that the committer intends to undeploy then redeploy and a partial undeploy would be undesirable
                                    child_process.execSync('sudo docker container rm -f ' + currentName + '_staging_web ' + currentName + '_staging_admin ' + currentName + '_staging_cordova ' + currentName + '_staging_electron ' + currentName + '_staging_vr', { stdio: [0, 1, 2] });
                                } catch (reason) {
                                    console.error(reason);
                                }
                            }
                            var productionBuildingConfigFile = path.resolve(processingDirectory + '/production-building', currentName + '.xml');
                            if (fs.existsSync(productionBuildingConfigFile)) {
                                console.log("moveIncomingToQueued found: " + productionBuildingConfigFile);
                                console.log("moveIncomingToQueued if another process already building it will be terminated: " + currentName);
                                fs.unlinkSync(productionBuildingConfigFile);
                                try {
                                    child_process.execSync('sudo docker container rm -f ' + currentName + '_production_web ' + currentName + '_production_admin ' + currentName + '_production_cordova ' + currentName + '_production_electron ' + currentName + '_production_vr', { stdio: [0, 1, 2] });
                                } catch (reason) {
                                    console.error(reason);
                                }
                            }
                            var repositoryName = "";
                            var committerName = "";
                            try {
                                var commitInfoJson = JSON.parse(fs.readFileSync(incomingFile + ".commit", 'utf8'));
                                repositoryName = commitInfoJson.repository;
                                committerName = commitInfoJson.user;
                                var storedCommitName = path.resolve(protectedDirectory + '/' + currentName, filename + ".commit");
                                fs.writeFileSync(storedCommitName, JSON.stringify(commitInfoJson, null, 4), { mode: 0o774 });
                                syncFileToSwarmNodes(storedCommitName);
                            } catch (error) {
                                console.error('failed to parse commit info: ' + error);
                            }
                            if (fs.existsSync(incomingFile + ".commit")) {
                                fs.unlinkSync(incomingFile + ".commit");
                                console.log('deleted parsed commit info file: ' + incomingFile + ".commit");
                                // copyDeleteFile(incomingFile + ".commit", storedCommitName);
                                // fs.renameSync(incomingFile + ".commit", storedCommitName);
                            }
                            initialiseResult(currentName, 'validating', false, repositoryName, committerName);
                            //if (fs.existsSync(targetDirectory + "/" + currentName)) {
                            // todo: consider if this agressive removal is always wanted
                            // todo: we might want this agressive target experiment name directory removal to prevent old output being served out
                            //    fs.rmSync(targetDirectory + "/" + currentName, { recursive: true });
                            //}
                            // Reverted to sync method when copying files to prevent premature usage by later stages and duplicate later stages while the file move is in process.
                            fs.renameSync(incomingFile, queuedFile);
                            foundFilesCount++;
                        } else {
                            fs.writeSync(resultsFile, "<div>removing unusable type: '" + filename + "'</div>");
                            //console.log('removing unusable type: ' + filename);
                            if (fs.existsSync(incomingFile)) {
                                fs.unlinkSync(incomingFile);
                                console.log('deleted unusable file: ' + incomingFile);
                            }
                        }
                    }
                }
                prepareForProcessing(); // if there are existing experiments in the build queue they can be started before converting more with JsonToXml
                var queuedList = fs.readdirSync(incomingDirectory + '/queued');
                if (queuedList.length > 0) {
                    convertJsonToXml();
                } else {
                    setTimeout(moveIncomingToQueued, 3000);
                }
            }
        }
    });
}

function convertJsonToXml() {
    //fs.writeSync(resultsFile, "<div>Converting JSON to XML, '" + new Date().toISOString() + "'</div>");
    var dockerString = /* TODO: check for json files before the mv or just use a loop or find . -type f -name '*.avi' -exec  rename   's/\.(?=[^.]*\.)/ /g' "{}" \; ish */'mv /FrinexBuildService/incoming/queued/*.json /FrinexBuildService/incoming/prevalidation/;'
        // + ' &>> ' + targetDirectory + '/json_to_xml.txt;'
        + ' mv /FrinexBuildService/incoming/queued/*.xml /FrinexBuildService/incoming/prevalidation/;'
        // + ' &>> ' + targetDirectory + '/json_to_xml.txt;'
        + ' if [[ $(sudo docker container ls) == *"json_to_xml"* ]]; then'
        // + ' sudo docker container rm -f json_to_xml'
        + ' echo "json_to_xml still active";'
        // + ' &>> ' + targetDirectory + '/json_to_xml.txt;'
        + ' else'
        + ' sudo docker run --rm '
        + taskContainerOptions
        //+ ' --user "$(id -u):$(id -g)"'
        + ' --name json_to_xml'
        + ' -v incomingDirectory:/FrinexBuildService/incoming'
        + ' -v processingDirectory:/FrinexBuildService/processing'
        + ' -v listingDirectory:/FrinexBuildService/listing'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        // we use beta in this case because stable currently does not support all the features required such as locales
        // now we are using alpha because that validates redirectToURL for metadata presenters
        // 2023-04-13 we are now back to beta because the above changes have been promoted
        + ' frinexapps-jdk:alpha /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150'
        // + ' -Dlog4j2.version=2.17.2'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml /FrinexBuildService/incoming/prevalidation /FrinexBuildService/incoming/postvalidation /FrinexBuildService/listing ' + targetDirectory /* the schema file is in the target directory, however it might be nicer to use a dedicated directory when we support multiple schema/build versions */ + '\\"'
        + ' &> ' + targetDirectory + '/json_to_xml.txt;'
        + ' mv /FrinexBuildService/incoming/postvalidation/* /FrinexBuildService/processing/validated/'
        + ' &>> ' + targetDirectory + '/json_to_xml.txt;'
        + ' chmod 774 -R /FrinexBuildService/processing/validated /FrinexBuildService/listing'
        + ' &>> ' + targetDirectory + '/json_to_xml.txt;";'
        + ' fi;';
    //+ " &> " + targetDirectory + "/JsonToXml_" + new Date().toISOString() + ".txt";
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("convert JSON to XML finished");
        //fs.writeSync(resultsFile, "<div>Conversion from JSON to XML finished, '" + new Date().toISOString() + "'</div>");
        prepareForProcessing();
    } catch (reason) {
        console.error(reason);
        console.error("convert JSON to XML failed");
        fs.writeSync(resultsFile, "<div>conversion from JSON to XML failed, '" + new Date().toISOString() + "'</div>");
    };
    moveIncomingToQueued();
}

function updateDocumentation() {
    // extract the latest versions of frinex.xml frinex.xsd and minimal_example.xml from the frinexapps-jdk:latest image that is currently in use
    var dockerString = 'sudo docker container rm -f update_schema_docs'
        + ' &> ' + targetDirectory + '/update_schema_docs.txt;'
        /*
        note: these files are created when the images are generated and therefore do not need to be copied at this point
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/stable.xsd"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:stable /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/stable.html"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:beta /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/beta.xsd"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:beta /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/beta.html"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.xsd /FrinexBuildService/artifacts/latest.xsd"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm --name update_schema_docs -v buildServerTarget:/FrinexBuildService/artifacts -w /ExperimentTemplate/gwt-cordova frinexapps-jdk:latest /bin/bash -c "cp /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/frinex.html /FrinexBuildService/artifacts/latest.html"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        */
        + 'sudo docker run --rm '
        + taskContainerOptions
        + ' --name update_schema_docs'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        + ' frinexapps-jdk:stable /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150'
        // + ' -Dlog4j2.version=2.17.2'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.DocumentationGenerator ' + targetDirectory + /*'/FrinexBuildService/docs '*/ ' ' + targetDirectory + '\\"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod 774 ' + targetDirectory + '/minimal_example.xml'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod 774 ' + targetDirectory + '/frinex.html'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod 774 ' + targetDirectory + '/frinex.xsd'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;"';
    // console.log(dockerString);
    try {
        child_process.execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("update_schema_docs finished");
    } catch (reason) {
        console.error(reason);
        console.error("update_schema_docs failed");
    };
}

function checkServerCertificates() {
    buildHistoryJson.certificateStatus = "";
    certificateCheckList.split(",").forEach(function (checkItem) {
        var certificateUrl = checkItem.split(":")[0];
        var certificatePort = checkItem.split(":")[1];
        sslChecker(certificateUrl, { method: "GET", port: certificatePort }).then(result => {
            console.log("checkServerCertificates\n" + checkItem + " : ");
            console.log(result);
            buildHistoryJson.certificateStatus += checkItem + " certificate " + result.daysRemaining + " days remaining<br>";
        }).catch(error => {
            console.log("checkServerCertificates\n" + checkItem + " : " + error.message);
            buildHistoryJson.certificateStatus += checkItem + " " + error.message + "<br>";
        });
    });
}

function prepareImageList() {
    // generate a searchable list of frinex versions
    var dockerString = "sudo docker image ls | grep frinexapps-jdk | awk 'NR>0 {print $2 \",\"}'"
    // console.log(dockerString);
    try {
        child_process.exec(dockerString, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                console.error("prepareImageList failed");
            }
            availableImageList = stdout;
            console.log(stdout);
            console.log(stderr);
            console.log("prepareImageList finished");
        });
    } catch (reason) {
        console.error(reason);
        console.error("prepareImageList failed");
    };
}

function prepareBuildHistory() {
    if (fs.existsSync(experimentTokensFileName)) {
        try {
            experimentTokensJson = JSON.parse(fs.readFileSync(experimentTokensFileName, 'utf8'));
            fs.writeFileSync(experimentTokensFileName + ".temp", JSON.stringify(experimentTokensJson, null, 4), { mode: 0o774 });
            var now = new Date();
            var datedFileSuffix = '-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
            fs.writeFileSync(experimentTokensFileName + datedFileSuffix, JSON.stringify(experimentTokensJson, null, 4), { mode: 0o774 });
        } catch (error) {
            console.error("faild to read " + experimentTokensFileName);
            console.error(error);
            try {
                experimentTokensJson = JSON.parse(fs.readFileSync(experimentTokensFileName + ".temp", 'utf8'));
            } catch (error) {
                console.error("faild to read " + experimentTokensFileName + ".temp");
                console.error(error);
            }
        }
    }
    if (fs.existsSync(buildStatisticsFileName)) {
        try {
            buildStatisticsJson = JSON.parse(fs.readFileSync(buildStatisticsFileName, 'utf8'));
        } catch (error) {
            console.error("faild to read " + buildStatisticsFileName);
            console.error(error);
        }
    }
    if (fs.existsSync(buildHistoryFileName)) {
        try {
            var buildHistoryJsonTemp = JSON.parse(fs.readFileSync(buildHistoryFileName, 'utf8'));
            fs.writeFileSync(buildHistoryFileName + ".temp", JSON.stringify(buildHistoryJsonTemp, null, 4), { mode: 0o774 });
            var now = new Date();
            var datedFileSuffix = '-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
            fs.writeFileSync(buildHistoryFileName + datedFileSuffix, JSON.stringify(buildHistoryJsonTemp, null, 4), { mode: 0o774 });
            for (var keyString in buildHistoryJsonTemp.table) {
                buildHistoryJson.table[keyString] = {};
                for (var cellString in buildHistoryJsonTemp.table[keyString]) {
                    buildHistoryJson.table[keyString][cellString] = {};
                    // filtering out expired building CSS colours and "building" and "pending" strings
                    if (buildHistoryJsonTemp.table[keyString][cellString].style === 'background: #C3C3F3') {
                        buildHistoryJson.table[keyString][cellString].style = '';
                        buildHistoryJson.table[keyString][cellString].value = buildHistoryJsonTemp.table[keyString][cellString].value.replace(/building/g, 'unknown');
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'queued') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'validating') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'checking') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'restarting build') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'waiting rebuild') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else if (buildHistoryJsonTemp.table[keyString][cellString].value === 'DB failed') {
                        buildHistoryJson.table[keyString][cellString].value = '';
                        buildHistoryJson.table[keyString][cellString].style = '';
                    } else {
                        buildHistoryJson.table[keyString][cellString].value = buildHistoryJsonTemp.table[keyString][cellString].value;
                        buildHistoryJson.table[keyString][cellString].style = buildHistoryJsonTemp.table[keyString][cellString].style;
                        buildHistoryJson.table[keyString][cellString].ms = buildHistoryJsonTemp.table[keyString][cellString].ms;
                        buildHistoryJson.table[keyString][cellString].built = buildHistoryJsonTemp.table[keyString][cellString].built;
                    }
                }
            }
            // get the current free memory
            buildHistoryJson.memoryFree = os.freemem();
            buildHistoryJson.memoryTotal = os.totalmem();
            buildHistoryJson.stagingServerUrl = stagingServerUrl;
            buildHistoryJson.productionServerUrl = productionServerUrl;
            buildHistoryJson.buildHost = buildHost;
            // remember the last free disk
            buildHistoryJson.diskFree = buildHistoryJsonTemp.diskFree;
            buildHistoryJson.diskTotal = buildHistoryJsonTemp.diskTotal;
            // remember the last server certificate status
            buildHistoryJson.certificateStatus = buildHistoryJsonTemp.certificateStatus;
            // request the current free disk
            diskSpace('/').then((info) => {
                buildHistoryJson.diskFree = info.free;
                buildHistoryJson.diskTotal = info.size;
            });
            // update the docker service listing JSON
            updateServicesJson();
        } catch (error) {
            console.error("faild to read " + buildHistoryJson);
            console.error(error);
            try {
                buildHistoryJson = JSON.parse(fs.readFileSync(buildHistoryFileName + ".temp", 'utf8'));
            } catch (error) {
                console.error("faild to read " + buildHistoryJson + ".temp");
                console.error(error);
            }
        }
    }
    startResult();
    updateDocumentation();
    moveIncomingToQueued();
}

function deleteOldProcessing() {
    // since this is only called on a restart we delete the sub directories of the processing directory
    var processingList = fs.readdirSync(processingDirectory);
    for (var currentDirectory of processingList) {
        var currentDirectoryPath = path.resolve(processingDirectory, currentDirectory);
        fs.rmSync(currentDirectoryPath, { recursive: true, force: true });
        console.log('deleted processing: ' + currentDirectory);
    }
    // clean up any static files from before the restart
    var staticList = fs.readdirSync(staticFilesDirectory);
    for (var currentDirectory of staticList) {
        if (fs.existsSync(incomingDirectory + '/commits/' + currentDirectory + '.json') || fs.existsSync(incomingDirectory + '/commits/' + currentDirectory + '.xml')) {
            console.log('keeping static files: ' + currentDirectory);
        } else {
            var currentDirectoryPath = path.resolve(staticFilesDirectory, currentDirectory);
            console.log('deleting static files: ' + currentDirectory);
            fs.rmSync(currentDirectoryPath, { recursive: true });
            if (fs.existsSync(incomingDirectory + '/commits/' + currentDirectory + ".xml.commit")) {
                console.log('deleting stray commit info file: ' + currentDirectory + ".xml.commit");
                fs.unlinkSync(incomingDirectory + '/commits/' + currentDirectory + ".xml.commit");
            }
        }
    }
    const servicesLogFileName = targetDirectory + "/proxyUpdateTrigger.log";
    if (fs.existsSync(servicesLogFileName)) {
        fs.unlinkSync(servicesLogFileName);
    }
    prepareBuildHistory();
    prepareImageList();
    checkServerCertificates();
}

/* /maven/.m2 is not mounted on the build container
function checkPrerequisits() {
    if (!fs.existsSync("/maven/.m2/settings.xml")) {
        // the m2Settings from publish.properties is not currently used, should it be reinstated?
        console.log("Maven settings missing, exiting");
    } else {
        deleteOldProcessing();
    }
} */
deleteOldProcessing();
