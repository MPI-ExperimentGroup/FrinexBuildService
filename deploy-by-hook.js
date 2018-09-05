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
const incomingDirectory = properties.get('settings.incomingDirectory');
const processingDirectory = properties.get('settings.processingDirectory');
const targetDirectory = properties.get('settings.targetDirectory');
const configServer = properties.get('webservice.configServer');
const stagingServer = properties.get('staging.serverName');
const stagingServerUrl = properties.get('staging.serverUrl');
const stagingGroupsSocketUrl = properties.get('staging.groupsSocketUrl');
const productionServer = properties.get('production.serverName');
const productionServerUrl = properties.get('production.serverUrl');
const productionGroupsSocketUrl = properties.get('production.groupsSocketUrl');
const listingJsonFiles = properties.get('settings.listingJsonFiles');

var resultsFile = fs.createWriteStream(targetDirectory + "/index.html", {flags: 'w', mode: 0o755});

var buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildHistoryJson = {table: {}};
if (fs.existsSync(buildHistoryFileName)) {
    try {
        buildHistoryJson = JSON.parse(fs.readFileSync(buildHistoryFileName, 'utf8'));
        fs.writeFileSync(buildHistoryFileName + ".temp", JSON.stringify(buildHistoryJson, null, 4));
    } catch (error) {
        console.log("faild to read " + buildHistoryJson);
        console.log(error);
        try {
            buildHistoryJson = JSON.parse(fs.readFileSync(buildHistoryFileName + ".temp", 'utf8'));
        } catch (error) {
            console.log("faild to read " + buildHistoryJson + ".temp");
            console.log(error);
        }
    }
}

function startResult() {
    resultsFile.write("<style>table, th, td {border: 1px solid #d4d4d4; border-spacing: 0px;}</style>\n");
    resultsFile.write("<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>\n");
    resultsFile.write("<div id='buildLabel'>Building...</div>\n");
    resultsFile.write("<div id='buildDate'></div>\n");
    resultsFile.write("<table id='buildTable'>\n");
    resultsFile.write("<tr><td>experiment</td><td>last update</td><td>validation</td><td>staging web</td><td>staging android</td><td>staging desktop</td><td>staging admin</td><td>production web</td><td>production android</td><td>production desktop</td><td>production admin</td><tr>\n");
    resultsFile.write("</table>\n");
    resultsFile.write("<a href='git-push-log.html'>log</a>&nbsp;\n");
    resultsFile.write("<a href='git-update-log.txt'>update-log</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-out.txt'>out</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-err.txt'>err</a>&nbsp;\n");
    resultsFile.write("<script>\n");
    resultsFile.write("function doUpdate() {\n");
    resultsFile.write("$.getJSON('buildhistory.json?'+new Date().getTime(), function(data) {\n");
//    resultsFile.write("console.log(data);\n");
    resultsFile.write("for (var keyString in data.table) {\n");
//    resultsFile.write("console.log(keyString);\n");
    resultsFile.write("var experimentRow = document.getElementById(keyString+ '_row');\n");
    resultsFile.write("if (!experimentRow) {\n");
    resultsFile.write("var tableRow = document.createElement('tr');\n");
    resultsFile.write("tableRow.id = keyString+ '_row';\n");
    resultsFile.write("document.getElementById('buildTable').appendChild(tableRow);\n");
    resultsFile.write("}\n");
    resultsFile.write("for (var cellString in data.table[keyString]) {\n");
//    resultsFile.write("console.log(cellString);\n");
    resultsFile.write("var experimentCell = document.getElementById(keyString + '_' + cellString);\n");
    resultsFile.write("if (!experimentCell) {\n");
    resultsFile.write("var tableCell = document.createElement('td');\n");
    resultsFile.write("tableCell.id = keyString + '_' + cellString;\n");
    resultsFile.write("document.getElementById(keyString + '_row').appendChild(tableCell);\n");
    resultsFile.write("}\n");
    resultsFile.write("document.getElementById(keyString + '_' + cellString).innerHTML = data.table[keyString][cellString].value;\n");
    resultsFile.write("document.getElementById(keyString + '_' + cellString).style = data.table[keyString][cellString].style;\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("if(data.building){\n");
    resultsFile.write("updateTimer = window.setTimeout(doUpdate, 1000);\n");
    resultsFile.write("} else {\n");
    resultsFile.write("updateTimer = window.setTimeout(doUpdate, 10000);\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("}\n");
    resultsFile.write("var updateTimer = window.setTimeout(doUpdate, 100);\n");
    resultsFile.write("</script>\n");
    buildHistoryJson.building = true;
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4));
}


function initialiseResult(name, message, isError) {
    var style = '';
    if (isError) {
        style = 'background: #F3C3C3';
    }
    buildHistoryJson.table[name] = {
        "_experiment": {value: name, style: ''},
        "_date": {value: message, style: style},
//        "_validation_link_json": {value: '', style: ''},
//        "_validation_link_xml": {value: '', style: ''},
        "_validation_json_xsd": {value: '', style: ''},
        "_staging_web": {value: '', style: ''},
        "_staging_android": {value: '', style: ''},
        "_staging_desktop": {value: '', style: ''},
        "_staging_admin": {value: '', style: ''},
        "_production_web": {value: '', style: ''},
        "_production_android": {value: '', style: ''},
        "_production_desktop": {value: '', style: ''},
        "_production_admin": {value: '', style: ''}
    };
    // todo: remove any listing.json
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4));
}

function storeResult(name, message, stage, type, isError, isBuilding, isDone) {
    buildHistoryJson.table[name]["_date"].value = new Date().toISOString();
//    buildHistoryJson.table[name]["_date"].value = '<a href="' + name + '.xml">' + new Date().toISOString() + '</a>';
    buildHistoryJson.table[name]["_" + stage + "_" + type].value = message;
    if (isError) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #F3C3C3';
        for (var index in buildHistoryJson.table[name]) {
            if (buildHistoryJson.table[name][index].value === "queued") {
                buildHistoryJson.table[name][index].value = "skipped";
            }
        }
    } else if (isBuilding) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #C3C3F3';
    } else if (isDone) {
        buildHistoryJson.table[name]["_" + stage + "_" + type].style = 'background: #C3F3C3';
    }
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4));
}

function stopUpdatingResults() {
//    updatesFile.write("document.getElementById('buildLabel').innerHTML = 'Build process complete';\n");
//    updatesFile.write("document.getElementById('buildDate').innerHTML = '" + new Date().toISOString() + "';\n");
//    updatesFile.write("window.clearTimeout(updateTimer);\n");
    buildHistoryJson.building = false;
    buildHistoryJson.buildLabel = 'Build process complete';
    buildHistoryJson.buildDate = new Date().toISOString();
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4));
}


function deployStagingGui(listing, currentEntry) {
    // we create a new mvn instance for each child pom
    var mvngui = require('maven').create({
        cwd: __dirname + "/gwt-cordova",
        settings: m2Settings
    });
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "_staging.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "_staging.txt");
    }
    var mavenLogSG = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.txt", {mode: 0o755});
    process.stdout.write = process.stderr.write = mavenLogSG.write.bind(mavenLogSG);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging.txt">building</a>', "staging", "web", false, true, false);
    mvngui.execute(['clean', (currentEntry.isWebApp) ? 'tomcat7:undeploy' : 'package', (currentEntry.isWebApp) ? 'tomcat7:redeploy' : 'package'], {
//    mvngui.execute(['clean', 'gwt:run'], {
        'skipTests': true, '-pl': 'frinex-gui',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': processingDirectory,
        'versionCheck.allowSnapshots': 'true',
        'versionCheck.buildType': 'stable',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl,
        'experiment.groupsSocketUrl': stagingGroupsSocketUrl,
        'experiment.isScaleable': currentEntry.isScaleable,
        'experiment.defaultScale': currentEntry.defaultScale
//                    'experiment.scriptSrcUrl': stagingServerUrl,
//                    'experiment.staticFilesUrl': stagingServerUrl
    }).then(function (value) {
        console.log("frinex-gui finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_staging.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '/TestingFrame.html">robot</a>', "staging", "web", false, false, true);
//        var successFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
//        successFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(value, null, 4));
//        console.log(targetDirectory);
//        console.log(value);
        // build cordova 
        if (currentEntry.isAndroid || currentEntry.isiOS) {
            buildApk(currentEntry.buildName, "staging");
        }
        if (currentEntry.isDesktop) {
            buildElectron(currentEntry.buildName, "staging");
        }
        deployStagingAdmin(listing, currentEntry);
//        buildNextExperiment(listing);
    }, function (reason) {
//        console.log(targetDirectory);
//        console.log(JSON.stringify(reason, null, 4));
        console.log("frinex-gui staging failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging.txt">failed</a>', "staging", "web", true, false, false);
//        var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
//        errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
        buildNextExperiment(listing);
    });
}
function deployStagingAdmin(listing, currentEntry) {
    var mvnadmin = require('maven').create({
        cwd: __dirname + "/registration",
        settings: m2Settings
    });
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "_staging_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "_staging_admin.txt");
    }
    var mavenLogSA = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging_admin.txt", {mode: 0o755});
    process.stdout.write = process.stderr.write = mavenLogSA.write.bind(mavenLogSA);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging_admin.txt">building</a>', "staging", "admin", false, true, false);
    mvnadmin.execute(['clean', 'tomcat7:undeploy', 'tomcat7:redeploy'], {
        'skipTests': true, '-pl': 'frinex-admin',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': processingDirectory,
        'versionCheck.allowSnapshots': 'true',
        'versionCheck.buildType': 'stable',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl
    }).then(function (value) {
        console.log(value);
//                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
        console.log("frinex-admin finished");
//        storeResult(currentEntry.buildName, "deployed", "staging", "admin", false, false);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_staging_admin.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>', "staging", "admin", false, false, true);
        if (currentEntry.state === "production") {
            deployProductionGui(listing, currentEntry);
        } else {
            buildNextExperiment(listing);
        }
    }, function (reason) {
        console.log(reason);
        console.log("frinex-admin staging failed");
        console.log(currentEntry.experimentDisplayName);
//        storeResult(currentEntry.buildName, "failed", "staging", "admin", true, false);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
        buildNextExperiment(listing);
    });
}
function deployProductionGui(listing, currentEntry) {
    console.log(productionServerUrl + '/' + currentEntry.buildName);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production.txt">building</a>', "production", "web", false, true, false);
    http.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
        if (response.statusCode !== 404) {
            console.log("existing frinex-gui production found, aborting build!");
            console.log(response.statusCode);
            storeResult(currentEntry.buildName, "existing production found, aborting build!", "production", "web", true, false, false);
            buildNextExperiment(listing);
        } else {
            console.log(response.statusCode);
            var mvngui = require('maven').create({
                cwd: __dirname + "/gwt-cordova",
                settings: m2Settings
            });
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "_production.txt")) {
                fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "_production.txt");
            }
            var mavenLogPG = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_production.txt", {mode: 0o755});
            process.stdout.write = process.stderr.write = mavenLogPG.write.bind(mavenLogPG);
            mvngui.execute(['clean', (currentEntry.isWebApp) ? 'tomcat7:deploy' : 'package'], {
                'skipTests': true, '-pl': 'frinex-gui',
//                    'altDeploymentRepository.snapshot-repo.default.file': '~/Desktop/FrinexAPKs/',
//                    'altDeploymentRepository': 'default:file:file://~/Desktop/FrinexAPKs/',
//                            'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
//                    'maven.repo.local': '~/Desktop/FrinexAPKs/',
                'experiment.configuration.name': currentEntry.buildName,
                'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                'experiment.webservice': configServer,
                'experiment.configuration.path': processingDirectory,
                'versionCheck.allowSnapshots': 'true',
                'versionCheck.buildType': 'stable',
                'experiment.destinationServer': productionServer,
                'experiment.destinationServerUrl': productionServerUrl,
                'experiment.groupsSocketUrl': productionGroupsSocketUrl,
                'experiment.isScaleable': currentEntry.isScaleable,
                'experiment.defaultScale': currentEntry.defaultScale
//                            'experiment.scriptSrcUrl': productionServerUrl,
//                            'experiment.staticFilesUrl': productionServerUrl
            }).then(function (value) {
                console.log("frinex-gui production finished");
//                storeResult(currentEntry.buildName, "skipped", "production", "web", false, false, true);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_production.war">download</a>&nbsp;<a href="http://frinexproduction.mpi.nl/' + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true);
                if (currentEntry.isAndroid || currentEntry.isiOS) {
                    buildApk(currentEntry.buildName, "production");
                }
                if (currentEntry.isDesktop) {
                    buildElectron(currentEntry.buildName, "production");
                }
                deployProductionAdmin(listing, currentEntry);
//                buildNextExperiment(listing);
            }, function (reason) {
                console.log(reason);
                console.log("frinex-gui production failed");
                console.log(currentEntry.experimentDisplayName);
//                storeResult(currentEntry.buildName, "failed", "production", "web", true, false);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production.txt">failed</a>', "production", "web", true, false, false);
                buildNextExperiment(listing);
            });
        }
    });
}
function deployProductionAdmin(listing, currentEntry) {
    var mvnadmin = require('maven').create({
        cwd: __dirname + "/registration",
        settings: m2Settings
    });
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "_production_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "_production_admin.txt");
    }
    var mavenLogPA = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_production_admin.txt", {mode: 0o755});
    process.stdout.write = process.stderr.write = mavenLogPA.write.bind(mavenLogPA);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production_admin.txt">building</a>', "production", "admin", false, true, false);
    mvnadmin.execute(['clean', 'tomcat7:deploy'], {
        'skipTests': true, '-pl': 'frinex-admin',
//                                'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': processingDirectory,
        'versionCheck.allowSnapshots': 'true',
        'versionCheck.buildType': 'stable',
        'experiment.destinationServer': productionServer,
        'experiment.destinationServerUrl': productionServerUrl
    }).then(function (value) {
//        console.log(value);
//                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
        console.log("frinex-admin production finished");
//        storeResult(currentEntry.buildName, "skipped", "production", "admin", false, false, true);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_production_admin.war">download</a>&nbsp;<a href="http://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>', "production", "admin", false, false, true);
        buildNextExperiment(listing);
    }, function (reason) {
        console.log(reason);
        console.log("frinex-admin production failed");
        console.log(currentEntry.experimentDisplayName);
//        storeResult(currentEntry.buildName, "failed", "production", "admin", true, false);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
        buildNextExperiment(listing);
    });
}

function buildApk(buildName, stage) {
    console.log("starting cordova build");
    storeResult(buildName, "building", stage, "android", false, true, false);
    try {
        execSync('bash gwt-cordova/target/setup-cordova.sh', {stdio: [0, 1, 2]});
        resultString += "built&nbsp;";
    } catch (ex) {
        resultString += "failed&nbsp;";
    }
    // copy the resulting zips and add links to the output JSON
    var resultString = "";
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        if (filename.endsWith("cordova.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_cordova.zip"));
            resultString += '<a href="' + buildName + "_cordova.zip" + '">zip</a>';
        }
    });
    console.log("build cordova finished");
    storeResult(buildName, resultString, stage, "android", false, false, true);
}

function buildElectron(buildName, stage) {
    console.log("starting electron build");
    storeResult(buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    try {
        execSync('bash gwt-cordova/target/setup-electron.sh', {stdio: [0, 1, 2]});
        resultString += "built&nbsp;";
    } catch (ex) {
        resultString += "failed&nbsp;";
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        console.log(filename);
        if (filename.endsWith("electron.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_electron.zip"));
            resultString += '<a href="' + buildName + "_electron.zip" + '">zip</a>';
        }
//                mkdir /srv/target/electron
//cp out/make/*linux*.zip ../with_simulus_example-linux.zip
//cp out/make/*win32*.zip ../with_simulus_example-win32.zip
//cp out/make/*darwin*.zip ../with_simulus_example-darwin.zip
    });    //- todo: copy the resutting zips and add links to the output JSON
    console.log("build electron finished");
    storeResult(buildName, resultString, stage, "desktop", false, false, true);
}

function buildNextExperiment(listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
//        console.log(currentEntry);
//                console.log("starting generate stimulus");
//                execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
        if (currentEntry.state === "staging" || currentEntry.state === "production") {
            deployStagingGui(listing, currentEntry);
        } else {
            buildNextExperiment(listing);
        }
    } else {
        console.log("build process from listing completed");
        stopUpdatingResults();
        // check for new files in the incoming directory by calling deleteOldProcessing
        deleteOldProcessing();
    }
}

function buildFromListing() {
    var listingJsonArray = [];
    var splitJsonFiles = listingJsonFiles.split(",");
    for (var index in splitJsonFiles) {
        if (fs.existsSync(splitJsonFiles[index])) {
            var listingJsonData = JSON.parse(fs.readFileSync(splitJsonFiles[index], 'utf8'));
            for (var listingIndex in listingJsonData) {
                listingJsonArray.push(listingJsonData[listingIndex]);
            }
        }
    }
    fs.readdir(processingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            var listing = [];
            var remainingFiles = list.length;
            list.forEach(function (filename) {
                console.log(filename);
                console.log(path.extname(filename));
                var fileNamePart = path.parse(filename).name;
                if (path.extname(filename) !== ".xml") {
                    if (fileNamePart.endsWith("_validation_error")) {
                        var xmlName = filename.substring(0, filename.length - 4 - "_validation_error".length) + ".xml";
                        var xmlPath = path.resolve(processingDirectory, xmlName);
                        console.log("Found _validation_error, checking for: " + xmlPath);
                        if (!fs.existsSync(xmlPath)) {
                            var validationMessage = '<a href="' + fileNamePart + '.txt"">failed&nbsp;</a>';
                            storeResult(fileNamePart.substring(0, fileNamePart.length - "_validation_error".length), validationMessage, "validation", "json_xsd", true, false, false);
                        }
                    }
                    remainingFiles--;
                } else if (fileNamePart === "multiparticipant") {
                    remainingFiles--;
                    initialiseResult(fileNamePart, 'disabled', true);
                    console.log("this script will not build multiparticipant without manual intervention");
                } else {
                    initialiseResult(fileNamePart, 'queued', false);
                    var validationMessage = "";
                    var filenamePath = path.resolve(processingDirectory, filename);
                    console.log(filename);
                    console.log(filenamePath);
                    var buildName = fileNamePart;
                    console.log(buildName);
                    var jsonPath = filenamePath.substring(0, filenamePath.length - 4) + ".json";
                    console.log(jsonPath);
                    if (fs.existsSync(jsonPath)) {
                        validationMessage += '<a href="' + fileNamePart + '.json">json&nbsp;</a>';
                        storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                    }
                    if (path.extname(filename) === ".xml") {
                        validationMessage += '<a href="' + fileNamePart + '.xml">xml</a>&nbsp;';
                        storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                    }
                    var schemaErrorPath = filenamePath.substring(0, filenamePath.length - 4) + "_validation_error.txt";
                    if (fs.existsSync(schemaErrorPath)) {
                        validationMessage += '<a href="' + fileNamePart + '_validation_error.txt">failed</a>&nbsp;';
                        storeResult(fileNamePart, validationMessage, "validation", "json_xsd", true, false, false);
                    } else {
                        validationMessage += 'passed&nbsp;';
                        storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                        var foundCount = 0;
                        var foundJson;
                        for (var index in listingJsonArray) {
                            if (listingJsonArray[index].buildName === buildName) {
                                foundJson = listingJsonArray[index];
                                foundCount++;
                            }
                        }
                        if (foundCount === 0) {
                            listing.push(
                                    {
                                        "publishDate": null,
                                        "expiryDate": null,
                                        "isWebApp": true,
                                        "isDesktop": false,
                                        "isiOS": false,
                                        "isAndroid": false,
                                        "buildName": fileNamePart,
                                        "state": "staging",
                                        "defaultScale": 1.0,
                                        "experimentInternalName": fileNamePart,
                                        "experimentDisplayName": fileNamePart
                                    });
                            storeResult(fileNamePart, 'queued', "staging", "web", false, false, false);
                            storeResult(fileNamePart, 'queued', "staging", "admin", false, false, false);
                            storeResult(fileNamePart, '', "staging", "android", false, false, false);
                            storeResult(fileNamePart, '', "staging", "desktop", false, false, false);
                            storeResult(fileNamePart, '', "production", "web", false, false, false);
                            storeResult(fileNamePart, '', "production", "admin", false, false, false);
                            storeResult(fileNamePart, '', "production", "android", false, false, false);
                            storeResult(fileNamePart, '', "production", "desktop", false, false, false);
                        } else if (foundCount === 1) {
                            listing.push(foundJson);
                            storeResult(fileNamePart, '', "staging", "web", false, false, false);
                            storeResult(fileNamePart, '', "staging", "admin", false, false, false);
                            storeResult(fileNamePart, '', "staging", "android", false, false, false);
                            storeResult(fileNamePart, '', "staging", "desktop", false, false, false);
                            storeResult(fileNamePart, '', "production", "web", false, false, false);
                            storeResult(fileNamePart, '', "production", "admin", false, false, false);
                            storeResult(fileNamePart, '', "production", "android", false, false, false);
                            storeResult(fileNamePart, '', "production", "desktop", false, false, false);
                            if (foundJson.state === "staging" || foundJson.state === "production") {
                                storeResult(foundJson.buildName, 'queued', "staging", "web", false, false, false);
                                storeResult(foundJson.buildName, 'queued', "staging", "admin", false, false, false);
                                if (foundJson.isAndroid) {
                                    storeResult(foundJson.buildName, 'queued', "staging", "android", false, false, false);
                                }
                                if (foundJson.isDesktop) {
                                    storeResult(foundJson.buildName, 'queued', "staging", "desktop", false, false, false);
                                }
                            }
                            if (foundJson.state === "production") {
                                storeResult(foundJson.buildName, 'queued', "production", "web", false, false, false);
                                storeResult(foundJson.buildName, 'queued', "production", "admin", false, false, false);
                                if (foundJson.isAndroid) {
                                    storeResult(foundJson.buildName, 'queued', "production", "android", false, false, false);
                                }
                                if (foundJson.isDesktop) {
                                    storeResult(foundJson.buildName, 'queued', "production", "desktop", false, false, false);
                                }
                            }
                        } else {
                            initialiseResult(fileNamePart, 'conflict', true);
                            // todo: put this text and related information into an error text file with link
                            console.log("this script will not build when two or more listings are found in " + listingJsonFiles);
                        }
                    }
                    remainingFiles--;
                }
                if (remainingFiles <= 0) {
                    console.log(JSON.stringify(listing));
                    buildNextExperiment(listing);
                }
            });
        }
    });
}

function moveIncomingToProcessing() {
    fs.readdir(incomingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            var remainingFiles = list.length;
            list.forEach(function (filename) {
                console.log('incoming: ' + filename);
                resultsFile.write("<div>incoming: " + filename + "</div>");
                var incomingFile = path.resolve(incomingDirectory, filename);
                if (path.extname(filename) === ".json") {
                    var jsonStoreFile = path.resolve(processingDirectory, filename);
                    console.log('incomingFile: ' + incomingFile);
                    console.log('jsonStoreFile: ' + jsonStoreFile);
                    fs.renameSync(incomingFile, jsonStoreFile);
                } else if (path.extname(filename) === ".xml") {
                    var baseName = filename.substring(0, filename.length - 4);
                    var mavenLogPathSG = targetDirectory + "/" + baseName + "_staging.txt";
                    var mavenLogPathSA = targetDirectory + "/" + baseName + "_staging_admin.txt";
                    var mavenLogPathPG = targetDirectory + "/" + baseName + "_production.txt";
                    var mavenLogPathPA = targetDirectory + "/" + baseName + "_production_admin.txt";
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
                    var processingName = path.resolve(processingDirectory, filename);
                    // preserve the current XML by copying it to /srv/target which will be accessed via a link in the first column of the results table
                    var configStoreFile = path.resolve(targetDirectory, filename);
                    console.log('configStoreFile: ' + configStoreFile);
//                    fs.copyFileSync(incomingFile, configStoreFile);
                    fs.renameSync(incomingFile, processingName);
                    fs.createReadStream(processingName).pipe(fs.createWriteStream(configStoreFile));
                    console.log('moved from incoming to processing: ' + filename);
                    resultsFile.write("<div>moved from incoming to processing: " + filename + "</div>");
                } else if (path.extname(filename) === ".xsd") {
                    // place the generated XSD file for use in XML editors
                    var targetName = path.resolve(targetDirectory, filename);
                    console.log('moved XSD from incoming to target: ' + filename);
                    fs.renameSync(incomingFile, targetName);
                } else if (filename.endsWith("_validation_error.txt")) {
                    var processingName = path.resolve(processingDirectory, filename);
                    fs.renameSync(incomingFile, processingName);
                    var configErrorFile = path.resolve(targetDirectory, filename);
                    fs.createReadStream(processingName).pipe(fs.createWriteStream(configErrorFile));
                    console.log('moved from incoming to processing: ' + filename);
                    resultsFile.write("<div>moved from incoming to processing: " + filename + "</div>");
                } else if (fs.existsSync(incomingFile)) {
                    fs.unlinkSync(incomingFile);
                }
                remainingFiles--;
                if (remainingFiles <= 0) {
                    // when no files are found in processing, this will not be called and the script will terminate, until called again by GIT
                    buildFromListing();
                }
            });
        }
    });
}
function convertJsonToXml() {
    resultsFile.write("<div>Converting JSON to XML, '" + new Date().toISOString() + "'</div>");
    fs.readdir(incomingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            list.forEach(function (filename) {
                if (path.extname(filename) === ".json") {
                    console.log('json: ' + filename);
                    initialiseResult(path.parse(filename).name, 'queued', false);
                }
            });
        }
    });
    var mvnConvert = require('maven').create({
        cwd: __dirname + "/ExperimentDesigner",
        settings: m2Settings
    });
    mvnConvert.execute(['exec:exec'], {
        'skipTests': true,
        'exec.executable': 'java',
        'exec.classpathScope': 'runtime',
        'versionCheck.allowSnapshots': 'true',
        'versionCheck.buildType': 'stable',
        'exec.args': '-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml ' + incomingDirectory + ' ' + incomingDirectory
    }).then(function (value) {
        console.log("convert JSON to XML finished");
        resultsFile.write("<div>Conversion from JSON to XML finished, '" + new Date().toISOString() + "'</div>");
        moveIncomingToProcessing();
    }, function (reason) {
        console.log(reason);
        console.log("convert JSON to XML failed");
        resultsFile.write("<div>Conversion from JSON to XML failed, '" + new Date().toISOString() + "'</div>");
    });
}

function deleteOldProcessing() {
    fs.readdir(processingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            var remainingFiles = list.length;
            if (remainingFiles <= 0) {
                convertJsonToXml();
            } else {
                list.forEach(function (filename) {
                    processedFile = path.resolve(processingDirectory, filename);
                    if (fs.existsSync(processedFile)) {
                        fs.unlinkSync(processedFile);
                        console.log('deleted processed file: ' + processedFile);
                    }
                    remainingFiles--;
                    if (remainingFiles <= 0) {
                        convertJsonToXml();
                    }
                });
            }
        }
    });
}

startResult();
deleteOldProcessing();
