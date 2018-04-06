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

const PropertiesReader = require('properties-reader');
const properties = PropertiesReader('publish.properties');
const request = require('request');
const execSync = require('child_process').execSync;
const http = require('http');
const fs = require('fs');
const path = require('path');
const m2Settings = properties.get('settings.m2Settings');
const configDirectory = properties.get('settings.configDirectory');
const targetDirectory = properties.get('settings.targetDirectory');
const configServer = properties.get('webservice.configServer');
const stagingServer = properties.get('staging.serverName');
const stagingServerUrl = properties.get('staging.serverUrl');
const stagingGroupsSocketUrl = properties.get('staging.groupsSocketUrl');
const productionServer = properties.get('production.serverName');
const productionServerUrl = properties.get('production.serverUrl');
const productionGroupsSocketUrl = properties.get('production.groupsSocketUrl');

var resultsFile = fs.createWriteStream(targetDirectory + "/index.html", {flags: 'w'})
var updatesFile = fs.createWriteStream(targetDirectory + "/updates.js", {flags: 'w'})

function startResult(listing) {
    resultsFile.write("<style>table, th, td {border: 1px solid #d4d4d4; border-spacing: 0px;}</style>");
    resultsFile.write("<div id='buildLabel'>Building...</div>");
    resultsFile.write("<div id='buildDate'></div>");
    resultsFile.write("<table>");
    resultsFile.write("<tr><td>experiment</td><td>last update</td><td>staging web</td><td>staging android</td><td>staging desktop</td><td>staging admin</td><td>production web</td><td>production android</td><td>production desktop</td><td>production admin</td><tr>");
    for (let currentEntry of listing) {
        resultsFile.write("<tr>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_experiment'>" + currentEntry.buildName + "</td>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_date'>queued</td>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_staging_web'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_staging_android'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_staging_desktop'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_staging_admin'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_production_web'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_production_android'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_production_desktop'/>");
        resultsFile.write("<td id='" + currentEntry.buildName + "_production_admin'/>");
        resultsFile.write("</tr>");
    }
    resultsFile.write("</table>");

    updatesFile.write("function doUpdate() {\n");
//    resultsFile.write("<script  type='text/javascript' id='updateScript' src='updates.js'/>");

    updatesFile.write("var headTag = document.getElementsByTagName('head')[0];");
    updatesFile.write("var updateScriptTag = document.getElementById('updateScript');");
    updatesFile.write("if (updateScriptTag) headTag.removeChild(updateScriptTag);");
    updatesFile.write("var scriptTag = document.createElement('script');");
    updatesFile.write("scriptTag.type = 'text/javascript';");
    updatesFile.write("scriptTag.id = 'updateScript';");
    updatesFile.write("scriptTag.src = 'updates.js?date='+ new Date().getTime();");
    updatesFile.write("headTag.appendChild(scriptTag);");
//    updatesFile.write("document.getElementById('updateScript').src = 'updates.js?date='+ new Date().getTime();\n");
    updatesFile.write("}\n");
    updatesFile.write("var updateTimer = window.setTimeout(doUpdate, 1000);\n");

    resultsFile.write("<script>");
    resultsFile.write("var headTag = document.getElementsByTagName('head')[0];");
    resultsFile.write("var scriptTag = document.createElement('script');");
    resultsFile.write("scriptTag.type = 'text/javascript';");
    resultsFile.write("scriptTag.id = 'updateScript';");
    resultsFile.write("scriptTag.src = 'updates.js?date='+ new Date().getTime();");
    resultsFile.write("headTag.appendChild(scriptTag);");
    resultsFile.write("</script>");
}


function storeResult(name, message, stage, type, isError, isBuilding) {
    updatesFile.write("document.getElementById('buildLabel').innerHTML = 'Building " + name + "';\n");
    updatesFile.write("document.getElementById('buildDate').innerHTML = '" + new Date().toISOString() + "';\n");
    updatesFile.write("document.getElementById('" + name + "_" + stage + "_" + type + "').innerHTML = '" + message + "';\n");
    updatesFile.write("document.getElementById('" + name + "_date').innerHTML = '" + new Date().toISOString() + "';\n");
    if (isError) {
        updatesFile.write("document.getElementById('" + name + "_" + stage + "_" + type + "').style='background: #F3C3C3';\n");
    } else if (isBuilding) {
        updatesFile.write("document.getElementById('" + name + "_" + stage + "_" + type + "').style='background: #C3C3F3';\n");
    } else {
        updatesFile.write("document.getElementById('" + name + "_" + stage + "_" + type + "').style='background: #C3F3C3';\n");
    }
}

function stopUpdatingResults() {
    updatesFile.write("document.getElementById('buildLabel').innerHTML = 'Build process complete';\n");
    updatesFile.write("document.getElementById('buildDate').innerHTML = '" + new Date().toISOString() + "';\n");
    updatesFile.write("window.clearTimeout(updateTimer);\n");
}


function deployStagingGui(listing, currentEntry) {
    // we create a new mvn instance for each child pom
    var mvngui = require('maven').create({
        cwd: __dirname + "/gwt-cordova",
        settings: m2Settings
    });
    storeResult(currentEntry.buildName, "building", "staging", "web", false, true);
    mvngui.execute(['clean'], {
//    mvngui.execute(['clean', 'gwt:run'], {
        'skipTests': true, '-pl': 'frinex-gui',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': configDirectory,
        'versionCheck.allowSnapshots': 'false',
        'versionCheck.buildType': 'staging',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl,
        'experiment.groupsSocketUrl': stagingGroupsSocketUrl,
        'experiment.isScaleable': currentEntry.isScaleable,
        'experiment.defaultScale': currentEntry.defaultScale
//                    'experiment.scriptSrcUrl': stagingServerUrl,
//                    'experiment.staticFilesUrl': stagingServerUrl
    }).then(function (value) {
        console.log("frinex-gui finished");
        storeResult(currentEntry.buildName, "deployed", "staging", "web", false, false);
        // build cordova 
        buildApk(currentEntry.buildName, "staging");
        buildElectron(currentEntry.buildName, "staging");
        deployStagingAdmin(listing, currentEntry);
//        buildNextExperiment(listing);
    }, function (reason) {
        console.log(reason);
        console.log("frinex-gui staging failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, "failed", "staging", "web", true, false);
        buildNextExperiment(listing);
    });
}
function deployStagingAdmin(listing, currentEntry) {
    var mvnadmin = require('maven').create({
        cwd: __dirname + "/registration",
        settings: m2Settings
    });
    storeResult(currentEntry.buildName, "building", "staging", "admin", false, true);
    mvnadmin.execute(['clean'], {
        'skipTests': true, '-pl': 'frinex-admin',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': configDirectory,
        'versionCheck.allowSnapshots': 'false',
        'versionCheck.buildType': 'staging',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl
    }).then(function (value) {
        console.log(value);
//                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
        console.log("frinex-admin finished");
        storeResult(currentEntry.buildName, "deployed", "staging", "admin", false, false);
        deployProductionGui(listing, currentEntry);
//        buildNextExperiment(listing);
    }, function (reason) {
        console.log(reason);
        console.log("frinex-admin staging failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, "failed", "staging", "admin", true, false);
//                        buildNextExperiment(listing);
    });
}
function deployProductionGui(listing, currentEntry) {
    console.log(productionServerUrl + '/' + currentEntry.buildName);
    storeResult(currentEntry.buildName, "building", "production", "web", false, true);
    http.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
        if (response.statusCode !== 404) {
            console.log("existing frinex-gui production found, aborting build!");
            console.log(response.statusCode);
            storeResult(currentEntry.buildName, "existing frinex-gui production found, aborting build!", "production", "web", true, false);
            buildNextExperiment(listing);
        } else {
            console.log(response.statusCode);
            var mvngui = require('maven').create({
                cwd: __dirname + "/gwt-cordova",
                settings: m2Settings
            });
            mvngui.execute(['clean'], {
                'skipTests': true, '-pl': 'frinex-gui',
//                    'altDeploymentRepository.snapshot-repo.default.file': '~/Desktop/FrinexAPKs/',
//                    'altDeploymentRepository': 'default:file:file://~/Desktop/FrinexAPKs/',
//                            'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
//                    'maven.repo.local': '~/Desktop/FrinexAPKs/',
                'experiment.configuration.name': currentEntry.buildName,
                'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                'experiment.webservice': configServer,
                'experiment.configuration.path': configDirectory,
                'versionCheck.allowSnapshots': 'false',
                'versionCheck.buildType': 'staging',
                'experiment.destinationServer': productionServer,
                'experiment.destinationServerUrl': productionServerUrl,
                'experiment.groupsSocketUrl': productionGroupsSocketUrl,
                'experiment.isScaleable': currentEntry.isScaleable,
                'experiment.defaultScale': currentEntry.defaultScale
//                            'experiment.scriptSrcUrl': productionServerUrl,
//                            'experiment.staticFilesUrl': productionServerUrl
            }).then(function (value) {
                console.log("frinex-gui production finished");
                storeResult(currentEntry.buildName, "skipped", "production", "web", false, false);
                buildApk(currentEntry.buildName, "production");
                buildElectron(currentEntry.buildName, "production");
                deployProductionAdmin(listing, currentEntry);
//                buildNextExperiment(listing);
            }, function (reason) {
                console.log(reason);
                console.log("frinex-gui production failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, "failed", "production", "web", true, false);
//                            buildNextExperiment(listing);
            });
        }
    });
}
function deployProductionAdmin(listing, currentEntry) {
    var mvnadmin = require('maven').create({
        cwd: __dirname + "/registration",
        settings: m2Settings
    });
    storeResult(currentEntry.buildName, "building", "production", "admin", false, true);
    mvnadmin.execute(['clean'], {
        'skipTests': true, '-pl': 'frinex-admin',
//                                'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': configDirectory,
        'versionCheck.allowSnapshots': 'false',
        'versionCheck.buildType': 'staging',
        'experiment.destinationServer': productionServer,
        'experiment.destinationServerUrl': productionServerUrl
    }).then(function (value) {
//        console.log(value);
//                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
        console.log("frinex-admin production finished");
        storeResult(currentEntry.buildName, "skipped", "production", "admin", false, false);
        buildNextExperiment(listing);
    }, function (reason) {
        console.log(reason);
        console.log("frinex-admin production failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, "failed", "production", "admin", true, false);
//                                buildNextExperiment(listing);
    });
}

function buildApk(buildName, stage) {
    console.log("starting cordova build");
    storeResult(buildName, "building", stage, "android", false, true);
//    execSync('bash gwt-cordova/target/setup-cordova.sh');
    console.log("build cordova finished");
    storeResult(buildName, "skipped", stage, "android", false, false);
}

function buildElectron(buildName, stage) {
    console.log("starting electron build");
    storeResult(buildName, "building", stage, "desktop", false, true);
//    execSync('bash gwt-cordova/target/setup-electron.sh');
    console.log("build electron finished");
    storeResult(buildName, "skipped", stage, "desktop", false, false);
}

function buildNextExperiment(listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        console.log(currentEntry);
//                console.log("starting generate stimulus");
//                execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
        deployStagingGui(listing, currentEntry);
    } else {
        console.log("build process from listing completed");
        stopUpdatingResults();
    }
}

function convertJsonToXml() {
    var mvnConvert = require('maven').create({
        cwd: __dirname + "/ExperimentDesigner",
        settings: m2Settings
    });
    mvnConvert.execute(['clean', 'package', 'exec:exec'], {
        'skipTests': true,
        'exec.executable': 'java',
        'exec.classpathScope': 'runtime',
        'exec.args': '-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml ' + configDirectory + ' ' + configDirectory
    }).then(function (value) {
        console.log("convert JSON to XML finished");
    }, function (reason) {
        console.log(reason);
        console.log("convert JSON to XML failed");
    });
}

function buildFromListing() {
    fs.readdir(configDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            var listing = [];
            var remainingFiles = list.length;

            list.forEach(function (filename) {
                console.log(filename);
                console.log(path.extname(filename));
                if (path.extname(filename) !== ".xml") {
                    remainingFiles--;
                } else {
                    filename = path.resolve(configDirectory, filename);
                    console.log(filename);
                    listing.push({
//                    configPath: path,
                        buildName: path.parse(filename).name,
                        experimentDisplayName: path.parse(filename).name
                    });
                    remainingFiles--;
                    if (remainingFiles <= 0) {
                        console.log(JSON.stringify(listing));
                        startResult(listing);
                        buildNextExperiment(listing);
                    }
                }
            });
        }
    });
}

convertJsonToXml();
buildFromListing();