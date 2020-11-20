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
const properties = PropertiesReader('ScriptsDirectory/publish.properties');
const execSync = require('child_process').execSync;
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const m2Settings = properties.get('settings.m2Settings');
const listingDirectory = properties.get('settings.listingDirectory');
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

var resultsFile = fs.createWriteStream(targetDirectory + "/index.html", {flags: 'w', mode: 0o755});

var buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildArtifactsFileName = __dirname + "/gwt-cordova/target/artifacts.json";
var buildHistoryJson = {table: {}};
var buildArtifactsJson = {artifacts: {}};
if (fs.existsSync(buildHistoryFileName)) {
    try {
        buildHistoryJson = JSON.parse(fs.readFileSync(buildHistoryFileName, 'utf8'));
        fs.writeFileSync(buildHistoryFileName + ".temp", JSON.stringify(buildHistoryJson, null, 4), {mode: 0o755});
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
    resultsFile.write("<style>table, th, td {border: 1px solid #d4d4d4; border-spacing: 0px;}.shortmessage {border-bottom: 1px solid;position: relative;display: inline-block;}.shortmessage .longmessage {visibility: hidden; width: 300px; color: white; background-color: black; border-radius: 10px; padding: 5px; text-align: centre; position: absolute;}.shortmessage:hover .longmessage {visibility: visible;} tr:hover {background-color: #3f51b521;}</style>\n");
    resultsFile.write("<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>\n");
    //resultsFile.write("<span id='buildLabel'>Building...</span>\n");
    resultsFile.write("<span id='buildDate'></span>\n");
    resultsFile.write("<a href='frinex.html'>XML Documentation</a>\n");
    resultsFile.write("<a href='frinex.xsd'>XML Schema</a>\n");
    resultsFile.write("<table id='buildTable'>\n");
    resultsFile.write("<tr>\n");
    resultsFile.write("<td><a href=\"#1\">experiment</a></td>\n");
    resultsFile.write("<td><a href=\"#2\">last update</a></td>\n");
    resultsFile.write("<td><a href=\"#3\">validation</a></td>\n");
    resultsFile.write("<td><a href=\"#4\">staging web</a></td>\n");
    resultsFile.write("<td><a href=\"#5\">staging android</a></td>\n");
    resultsFile.write("<td><a href=\"#6\">staging desktop</a></td>\n");
    resultsFile.write("<td><a href=\"#7\">staging admin</a></td>\n");
    resultsFile.write("<td><a href=\"#8\">production web</a></td>\n");
    resultsFile.write("<td><a href=\"#9\">production android</a></td>\n");
    resultsFile.write("<td><a href=\"#10\">production desktop</a></td>\n");
    resultsFile.write("<td><a href=\"#11\">production admin</a></td>\n");
    resultsFile.write("<tr>\n");
    resultsFile.write("</table>\n");
    resultsFile.write("<a href='git-push-log.html'>log</a>&nbsp;\n");
    resultsFile.write("<a href='git-update-log.txt'>update-log</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-out.txt'>out</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-err.txt'>err</a>&nbsp;\n");
    resultsFile.write("<script>\n");
    resultsFile.write("var applicationStatus = {};\n");
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
    // check the spring health here and show http and db status via applicationStatus array
    // the path -admin/health is for spring boot 1.4.1
    resultsFile.write("$.getJSON('" + stagingServerUrl + "/'+keyString+'-admin/health', (function(experimentName) { return function(data) {\n");
    resultsFile.write("$.each(data, function (key, val) {\n");
    resultsFile.write("if (key === 'status') {\n");
    resultsFile.write("if (val === 'UP') {\n");
    resultsFile.write("applicationStatus[experimentName + '__staging_admin'] = 'yellow';\n");
    resultsFile.write("} else {\n");
    resultsFile.write("applicationStatus[experimentName + '__staging_admin'] = 'red';\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("};}(keyString)));\n");
    resultsFile.write("$.getJSON('" + productionServerUrl + "/'+keyString+'-admin/health', (function(experimentName) { return function(data) {\n");
    resultsFile.write("$.each(data, function (key, val) {\n");
    resultsFile.write("if (key === 'status') {\n");
    resultsFile.write("if (val === 'UP') {\n");
    resultsFile.write("applicationStatus[experimentName + '__production_admin'] = 'yellow';\n");
    resultsFile.write("} else {\n");
    resultsFile.write("applicationStatus[experimentName + '__production_admin'] = 'red';\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("};}(keyString)));\n");
    // the path -admin/actuator/health is for spring boot 2.3.0
    resultsFile.write("$.getJSON('" + stagingServerUrl + "/'+keyString+'-admin/actuator/health', (function(experimentName) { return function(data) {\n");
    resultsFile.write("$.each(data, function (key, val) {\n");
    resultsFile.write("if (key === 'status') {\n");
    resultsFile.write("if (val === 'UP') {\n");
    resultsFile.write("applicationStatus[experimentName + '__staging_admin'] = 'green';\n");
    resultsFile.write("} else {\n");
    resultsFile.write("applicationStatus[experimentName + '__staging_admin'] = 'red';\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("};}(keyString)));\n");
    resultsFile.write("$.getJSON('" + productionServerUrl + "/'+keyString+'-admin/actuator/health', (function(experimentName) { return function(data) {\n");
    resultsFile.write("$.each(data, function (key, val) {\n");
    resultsFile.write("if (key === 'status') {\n");
    resultsFile.write("if (val === 'UP') {\n");
    resultsFile.write("applicationStatus[experimentName + '__production_admin'] = 'green';\n");
    resultsFile.write("} else {\n");
    resultsFile.write("applicationStatus[experimentName + '__production_admin'] = 'red';\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("};}(keyString)));\n");
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
//    resultsFile.write("var statusStyle = ($.inArray(keyString + '_' + cellString, applicationStatus ) >= 0)?';border-right: 5px solid green;':';border-right: 5px solid grey;';\n");
    resultsFile.write("var statusStyle = (keyString + '_' + cellString in applicationStatus)?';border-right: 3px solid ' + applicationStatus[keyString + '_' + cellString] + ';':'';\n");
    resultsFile.write("document.getElementById(keyString + '_' + cellString).style = data.table[keyString][cellString].style + statusStyle;\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("doSort();\n");
    resultsFile.write("if(data.building){\n");
    resultsFile.write("updateTimer = window.setTimeout(doUpdate, 1000);\n");
    resultsFile.write("} else {\n");
    resultsFile.write("updateTimer = window.setTimeout(doUpdate, 10000);\n");
    resultsFile.write("}\n");
    resultsFile.write("});\n");
    resultsFile.write("}\n");
    resultsFile.write("var updateTimer = window.setTimeout(doUpdate, 100);\n");
    resultsFile.write("function doSort() {\n");
    resultsFile.write("var sortData = location.href.split('#')[1];\n");
    resultsFile.write("var sortItem = sortData.split('_')[0];\n");
    resultsFile.write("var sortDirection = sortData.split('_')[1];\n");
    resultsFile.write("if($.isNumeric(sortItem)){\n");
    resultsFile.write("if(sortDirection === 'd'){\n");
    resultsFile.write("$('tr:gt(1)').each(function() {}).sort(function (b, a) {return $('td:nth-of-type('+sortItem+')', a).text().localeCompare($('td:nth-of-type('+sortItem+')', b).text());}).appendTo('tbody');\n");
    resultsFile.write("$('tr:first').children('td').children('a').each(function(index) {$(this).attr('href', '#' + (index + 1) + '_a')});\n");
    resultsFile.write("} else {\n");
    resultsFile.write("$('tr:gt(1)').each(function() {}).sort(function (a, b) {return $('td:nth-of-type('+sortItem+')', a).text().localeCompare($('td:nth-of-type('+sortItem+')', b).text());}).appendTo('tbody');\n");
    resultsFile.write("$('tr:first').children('td').children('a').each(function(index) {$(this).attr('href', '#' + (index + 1) + '_d')});\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("}\n");
    resultsFile.write("$(window).on('hashchange', function (e) {\n");
    resultsFile.write("doSort();\n");
    resultsFile.write("});\n");
    resultsFile.write("</script>\n");
    buildHistoryJson.building = true;
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), {mode: 0o755});
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
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), {mode: 0o755});
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
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), {mode: 0o755});
}

function stopUpdatingResults() {
//    updatesFile.write("document.getElementById('buildLabel').innerHTML = 'Build process complete';\n");
//    updatesFile.write("document.getElementById('buildDate').innerHTML = '" + new Date().toISOString() + "';\n");
//    updatesFile.write("window.clearTimeout(updateTimer);\n");
    buildHistoryJson.building = false;
    //buildHistoryJson.buildLabel = 'Build process complete';
    buildHistoryJson.buildDate = new Date().toISOString();
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), {mode: 0o755});
}

function unDeploy(listing, currentEntry) {
    // we create a new mvn instance for each child pom
    var mvngui = require('maven').create({
        cwd: __dirname + "/gwt-cordova",
        settings: m2Settings
    });
    console.log("request to unDeploy " + currentEntry.buildName);
    storeResult(currentEntry.buildName, 'undeploying', "staging", "web", false, true, false);
    mvngui.execute(['tomcat7:undeploy'], {
        'skipTests': true, '-pl': 'frinex-gui',
        'experiment.configuration.name': currentEntry.buildName,
        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
        'experiment.webservice': configServer,
        'experiment.configuration.path': processingDirectory,
        'versionCheck.allowSnapshots': 'true',
        'versionCheck.buildType': 'stable',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl
    }).then(function (value) {
        console.log("frinex-gui undeploy finished");
        storeResult(currentEntry.buildName, 'undeployed', "staging", "web", false, false, true);
        var mvnadmin = require('maven').create({
            cwd: __dirname + "/registration",
            settings: m2Settings
        });
        storeResult(currentEntry.buildName, 'undeploying', "staging", "admin", false, true, false);
        mvnadmin.execute(['tomcat7:undeploy'], {
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
            console.log("frinex-admin undeploy finished");
            storeResult(currentEntry.buildName, 'undeployed', "staging", "admin", false, false, true);
            mvngui.execute(['tomcat7:undeploy'], {
                'skipTests': true, '-pl': 'frinex-gui',
                'experiment.configuration.name': currentEntry.buildName,
                'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                'experiment.webservice': configServer,
                'experiment.configuration.path': processingDirectory,
                'versionCheck.allowSnapshots': 'true',
                'versionCheck.buildType': 'stable',
                'experiment.destinationServer': productionServer,
                'experiment.destinationServerUrl': productionServerUrl
            }).then(function (value) {
                console.log("frinex-gui undeploy finished");
                storeResult(currentEntry.buildName, 'undeployed', "production", "web", false, false, true);
                var mvnadmin = require('maven').create({
                    cwd: __dirname + "/registration",
                    settings: m2Settings
                });
                storeResult(currentEntry.buildName, 'undeploying', "production", "admin", false, true, false);
                mvnadmin.execute(['tomcat7:undeploy'], {
                    'skipTests': true, '-pl': 'frinex-admin',
                    'experiment.configuration.name': currentEntry.buildName,
                    'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                    'experiment.webservice': configServer,
                    'experiment.configuration.path': processingDirectory,
                    'versionCheck.allowSnapshots': 'true',
                    'versionCheck.buildType': 'stable',
                    'experiment.destinationServer': productionServer,
                    'experiment.destinationServerUrl': productionServerUrl
                }).then(function (value) {
                    console.log(value);
                    console.log("frinex-admin undeploy finished");
                    storeResult(currentEntry.buildName, 'undeployed', "production", "admin", false, false, true);
                    buildNextExperiment(listing);
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-admin undeploy failed");
                    console.log(currentEntry.experimentDisplayName);
                    storeResult(currentEntry.buildName, 'undeploy failed', "production", "admin", true, false, false);
                    buildNextExperiment(listing);
                });
            }, function (reason) {
                console.log(reason);
                console.log("frinex-gui undeploy failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, 'undeploy failed', "staging", "web", true, false, false);
                buildNextExperiment(listing);
            });
        }, function (reason) {
            console.log(reason);
            console.log("frinex-admin undeploy failed");
            console.log(currentEntry.experimentDisplayName);
            storeResult(currentEntry.buildName, 'undeploy failed', "staging", "admin", true, false, false);
            buildNextExperiment(listing);
        });
    }, function (reason) {
        console.log(reason);
        console.log("frinex-gui undeploy failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, 'undeploy failed', "staging", "web", true, false, false);
        buildNextExperiment(listing);
    });
}

function deployStagingGui(listing, currentEntry) {
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "_staging.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "_staging.txt");
    }
    fs.mkdirSync(targetDirectory + '/' + currentEntry.buildName);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging.txt">building</a>', "staging", "web", false, true, false);
    var dockerString = 'docker run'
        + ' -v ' + m2Settings + ':~/.m2/settings.xml' 
        + ' -v ' + processingDirectory + ':/processing' 
        + ' -v ' + targetDirectory + '/' + currentEntry.buildName + ':/target'
        + ' -w /ExperimentTemplate frinexapps mvn clean '
        + ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
        + ' -DskipTests'
        + ' -pl gwt-cordova'
        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
        + ' -Dxperiment.configuration.displayName=' + currentEntry.experimentDisplayName
        + ' -Dexperiment.webservice=' + configServer
        + ' -Dexperiment.configuration.path=/processing'
        + ' -DversionCheck.allowSnapshots=' + 'true'
        + ' -DversionCheck.buildType=' + 'stable'
        + ' -Dexperiment.destinationServer=' + stagingServer
        + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
        + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
        + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
        + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
        + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
        + '';
    exec(dockerString + ' &> ' + targetDirectory + "/" + currentEntry.buildName + "_staging.txt", (error, stdout, stderr) => {
        if (error) {
            console.error(`deployStagingGui error: ${error}`);
        }
        console.log(`deployStagingGui stdout: ${stdout}`);
        console.error(`deployStagingGui stderr: ${stderr}`);
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + ".war")) {
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
        } else {
//        console.log(targetDirectory);
//        console.log(JSON.stringify(reason, null, 4));
            console.log("frinex-gui staging failed");
            console.log(currentEntry.experimentDisplayName);
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging.txt">failed</a>', "staging", "web", true, false, false);
//        var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
//        errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
        };
    });
    buildNextExperiment(listing);
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
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_staging_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_staging_admin.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "staging", "admin", false, false, true);
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
    try {
        https.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
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
                    'experiment.defaultScale': currentEntry.defaultScale,
                    'experiment.registrationUrl': currentEntry.registrationUrlProduction
//                            'experiment.scriptSrcUrl': productionServerUrl,
//                            'experiment.staticFilesUrl': productionServerUrl
                }).then(function (value) {
                    console.log("frinex-gui production finished");
//                storeResult(currentEntry.buildName, "skipped", "production", "web", false, false, true);
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_production.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true);
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
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production.txt">failed (existing production unknown)</a>', "production", "web", true, false, false);
                    buildNextExperiment(listing);
                });
            }
        });
    } catch (exception) {
        console.log(exception);
        console.log("frinex-gui production failed");
        storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
    }
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
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '_production_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '_production_admin.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "production", "admin", false, false, true);
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
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + buildName + "_" + stage + "_android.log")) {
            fs.unlinkSync(targetDirectory + "/" + buildName + "_" + stage + "_android.log");
        }
        resultString += '<a href="' + buildName + "_" + stage + "_android.log" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "android", false, true, false);
        execSync('docker run -v ' + __dirname + '/gwt-cordova/target:/target -v ' + __dirname + '/FieldKitRecorder:/FieldKitRecorder frinexapps bash /target/setup-cordova.sh &> ' + targetDirectory + "/" + buildName + "_" + stage + "_android.log", {stdio: [0, 1, 2]});
    } catch (ex) {
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        if (filename.endsWith(".apk")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_" + stage + "_cordova.apk"));
            resultString += '<a href="' + buildName + "_" + stage + "_cordova.apk" + '">apk</a>&nbsp;';
            buildArtifactsJson.artifacts.apk = filename;
        }
        if (filename.endsWith("cordova.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_" + stage + "_cordova.zip"));
            resultString += '<a href="' + buildName + "_" + stage + "_cordova.zip" + '">src</a>&nbsp;';
        }
        if (filename.endsWith("android.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_" + stage + "_android.zip"));
            resultString += '<a href="' + buildName + "_" + stage + "_android.zip" + '">android-src</a>&nbsp;';
            buildArtifactsJson.artifacts.apk_src = filename;
        }
        if (filename.endsWith("ios.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_" + stage + "_ios.zip"));
            resultString += '<a href="' + buildName + "_" + stage + "_ios.zip" + '">ios-src</a>&nbsp;';
            buildArtifactsJson.artifacts.ios_src = filename;
        }
    });
    console.log("build cordova finished");
    storeResult(buildName, resultString, stage, "android", hasFailed, false, true);
//  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), {mode: 0o755});
}

function buildElectron(buildName, stage) {
    console.log("starting electron build");
    storeResult(buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + buildName + "_" + stage + "_electron.log")) {
            fs.unlinkSync(targetDirectory + "/" + buildName + "_" + stage + "_electron.log");
        }
        resultString += '<a href="' + buildName + "_" + stage + "_electron.log" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "desktop", false, true, false);
        execSync('docker run -v ' + __dirname + '/gwt-cordova/target:/target frinexapps bash /target/setup-electron.sh &> ' + targetDirectory + "/" + buildName + "_" + stage + "_electron.log", {stdio: [0, 1, 2]});
//        resultString += "built&nbsp;";
    } catch (ex) {
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        console.log(filename);
//        if (filename.endsWith("electron.log")) {
//            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "_" + stage + "_electron.log"));
//            resultString += '<a href="' + buildName + "_" + stage + "_electron.log" + '">log</a>';
//        }
        if (filename.endsWith(".zip")) {
            var fileTypeString = "zip";
            if (filename.indexOf("electron.zip") > -1) {
                fileTypeString = "src";
            } else
            if (filename.indexOf("win32-ia32.zip") > -1) {
                fileTypeString = "win32";
            } else
            if (filename.indexOf("win32-x64.zip") > -1) {
                fileTypeString = "win";
            } else
            if (filename.indexOf("darwin-x64.zip") > -1) {
                fileTypeString = "mac";
            } else
            if (filename.indexOf("linux-x64.zip") > -1) {
                fileTypeString = "linux";
            }
            if (fileTypeString !== "zip") {
                var finalName = buildName + "_" + stage + "_" + fileTypeString + ".zip";
                fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + finalName));
                if (filename !== finalName) {
                    fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(__dirname + "/gwt-cordova/target/" + finalName));
                }
                resultString += '<a href="' + finalName + '">' + fileTypeString + '</a>&nbsp;';
                buildArtifactsJson.artifacts[fileTypeString] = finalName;
            }
        }
        if (filename.endsWith(".asar")) {
            var fileTypeString = "asar";
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + filename));
            resultString += '<a href="' + filename + '">' + fileTypeString + '</a>&nbsp;';
            buildArtifactsJson.artifacts[fileTypeString] = filename;
        }
        if (filename.endsWith(".dmg")) {
            var fileTypeString = "dmg";
            var finalName = buildName + "_" + stage + ".dmg";
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + finalName));
            resultString += '<a href="' + finalName + '">' + fileTypeString + '</a>&nbsp;';
            buildArtifactsJson.artifacts[fileTypeString] = finalName;
        }
//                mkdir /srv/target/electron
//cp out/make/*linux*.zip ../with_stimulus_example-linux.zip
//cp out/make/*win32*.zip ../with_stimulus_example-win32.zip
//cp out/make/*darwin*.zip ../with_stimulus_example-darwin.zip
    });    //- todo: copy the resutting zips and add links to the output JSON
    console.log("build electron finished");
    storeResult(buildName, resultString, stage, "desktop", hasFailed, false, true);
//  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), {mode: 0o755});
}

function buildNextExperiment(listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
//        console.log(currentEntry);
//                console.log("starting generate stimulus");
//                execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
        if (currentEntry.state === "staging" || currentEntry.state === "production") {
            deployStagingGui(listing, currentEntry);
        } else if (currentEntry.state === "undeploy") {
            unDeploy(listing, currentEntry);
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
    fs.readdir(listingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            list.forEach(function (filename) {
                listingFile = path.resolve(listingDirectory, filename);
                var listingJsonData = JSON.parse(fs.readFileSync(listingFile, 'utf8'));
                listingJsonArray.push(listingJsonData);
            });
        }
    });
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
                            var validationMessage = '<a href="' + fileNamePart + '.txt"">failed</a>&nbsp;';
                            storeResult(fileNamePart.substring(0, fileNamePart.length - "_validation_error".length), validationMessage, "validation", "json_xsd", true, false, false);
                        }
                    }
                    remainingFiles--;
                } else if (fileNamePart === "multiparticipant") {
                    remainingFiles--;
                    storeResult(fileNamePart, 'disabled', "validation", "json_xsd", true, false, false);
                    console.log("this script will not build multiparticipant without manual intervention");
                } else if (filename === "listing.json") {
                    // read through this commited listing json file and look for undeploy targets then add them to the list if they are not already there
                    var commitedlistingJsonData = JSON.parse(fs.readFileSync(path.resolve(processingDirectory, filename), 'utf8'));
                    for (var listingIndex in commitedlistingJsonData) {
                        if (commitedlistingJsonData[listingIndex].state === "undeploy") {
                            var foundCount = 0;
                            for (var index in listingJsonArray) {
                                if (listingJsonArray[index].buildName === commitedlistingJsonData[listingIndex].buildName) {
                                    foundCount++;
                                }
                            }
                            if (foundCount === 0) {
                                listingJsonArray.push(commitedlistingJsonData[listingIndex]);
                            }
                        }
                    }
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
                        validationMessage += '<a href="' + fileNamePart + '.json">json</a>&nbsp;';
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
                            initialiseResult(fileNamePart, '<div class="shortmessage">conflict in listing.json<span class="longmessage">Two or more listings for this experiment exist in ' + listingJsonFiles + ' as a precaution this script will not continue until this error is resovled.</span></div>', true);
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
                } else if (path.extname(filename) === ".uml") {
                    // preserve the generated UML to be accessed via a link in the results table
                    var targetName = path.resolve(targetDirectory, filename);
                    console.log('moved UML from incoming to target: ' + filename);
                    fs.renameSync(incomingFile, targetName);
                } else if (path.extname(filename) === ".svg") {
                    // preserve the generated UML SVG to be accessed via a link in the results table
                    var targetName = path.resolve(targetDirectory, filename);
                    console.log('moved UML SVG from incoming to target: ' + filename);
                    fs.renameSync(incomingFile, targetName);
                } else if (path.extname(filename) === ".xsd") {
                    // place the generated XSD file for use in XML editors
                    var targetName = path.resolve(targetDirectory, filename);
                    console.log('moved XSD from incoming to target: ' + filename);
                    fs.renameSync(incomingFile, targetName);
                } else if (filename.endsWith("frinex.html")) {
                    // place the generated documentation file for use in web browsers
                    var targetName = path.resolve(targetDirectory, filename);
                    console.log('moved HTML from incoming to target: ' + filename);
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
    var dockerString = 'docker run'
        + ' -v ' + incomingDirectory + ':/incoming'
        + ' -v ' + listingDirectory + ':/listing'
        + ' -v ' + targetDirectory + ':/target'
        + ' -w /ExperimentTemplate/ExperimentDesigner' 
        + ' frinexcompiler:latest mvn exec:exec'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args="-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml /incoming /incoming /listing"'
        + '';
    console.log(dockerString);
    try {
        execSync(dockerString + " &> " + targetDirectory + "/JsonToXml_" + new Date().toISOString() + ".log", {stdio: [0, 1, 2]});
        console.log("convert JSON to XML finished");
        resultsFile.write("<div>Conversion from JSON to XML finished, '" + new Date().toISOString() + "'</div>");
        moveIncomingToProcessing();
    } catch (reason) {
        console.log(reason);
        console.log("convert JSON to XML failed");
        resultsFile.write("<div>Conversion from JSON to XML failed, '" + new Date().toISOString() + "'</div>");
    };
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
