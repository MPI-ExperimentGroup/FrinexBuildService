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

const PropertiesReader = require('properties-reader');
const properties = PropertiesReader('ScriptsDirectory/publish.properties');
const execSync = require('child_process').execSync;
const { exec } = require('child_process');
const got = require('got');
const fs = require('fs');
const path = require('path');
const os = require('os');
const diskSpace = require('check-disk-space').default;
const m2Settings = properties.get('settings.m2Settings');
const concurrentBuildCount = properties.get('settings.concurrentBuildCount');
const deploymentType = properties.get('settings.deploymentType');
const dockerRegistry = properties.get('settings.dockerRegistry');
const listingDirectory = properties.get('settings.listingDirectory');
const incomingDirectory = properties.get('settings.incomingDirectory');
const processingDirectory = properties.get('settings.processingDirectory');
const buildHost = properties.get('settings.buildHost');
const staticFilesDirectory = incomingDirectory + '/static';
const targetDirectory = properties.get('settings.targetDirectory');
const configServer = properties.get('webservice.configServer');
const stagingServer = properties.get('staging.serverName');
const stagingServerUrl = properties.get('staging.serverUrl');
const stagingGroupsSocketUrl = properties.get('staging.groupsSocketUrl');
const productionServer = properties.get('production.serverName');
const productionServerUrl = properties.get('production.serverUrl');
const productionGroupsSocketUrl = properties.get('production.groupsSocketUrl');

const resultsFile = fs.openSync(targetDirectory + "/index.html", "w"); //{ flags: 'w', mode: 0o755 });
const statsFile = fs.openSync(targetDirectory + "/buildstats.txt", "a"); //{ flags: 'w', mode: 0o755 });
const listingMap = new Map();
const currentlyBuilding = new Map();
const buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildHistoryJson = { table: {} };
var hasDoneBackup = false;

function startResult() {
    fs.writeSync(resultsFile, "<style>table, th, td {border: 1px solid #d4d4d4; border-spacing: 0px;}.shortmessage {border-bottom: 1px solid;position: relative;display: inline-block;}.shortmessage .longmessage {visibility: hidden; width: 300px; color: white; background-color: black; border-radius: 10px; padding: 5px; text-align: centre; position: absolute;}.shortmessage:hover .longmessage {visibility: visible;} tr:hover {background-color: #3f51b521;}</style>\n");
    fs.writeSync(resultsFile, "<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>\n");
    fs.writeSync(resultsFile, "<span id='buildLabel'>" + buildHost + "</span>\n");
    fs.writeSync(resultsFile, "<span id='buildDate'></span>\n");
    fs.writeSync(resultsFile, "<a href='frinex.html'>XML Documentation</a>\n");
    fs.writeSync(resultsFile, "<a href='frinex.xsd'>XML Schema</a>\n");
    fs.writeSync(resultsFile, "<span style='width: 100px;background-color: lightgray;display: inline-block; margin: 3px;'><span id='diskFree' style='background-color: mediumaquamarine;width: 0%; display: block; white-space: nowrap;'>Disk</span></span>\n");
    fs.writeSync(resultsFile, "<span style='width: 100px;background-color: lightgray;display: inline-block; margin: 3px;'><span id='memoryFree' style='background-color: mediumaquamarine;width: 0%; display: block; white-space: nowrap;'>Memory</span></span>\n");
    fs.writeSync(resultsFile, "<table id='buildTable'>\n");
    fs.writeSync(resultsFile, "<tr>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#1\">repository</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#2\">committer</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#3\">experiment</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#4\">last update</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#5\">validation</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#6\">staging web</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#7\">staging android</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#8\">staging desktop</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#9\">staging admin</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#10\">production server</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#11\">production web</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#12\">production android</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#13\">production desktop</a></td>\n");
    fs.writeSync(resultsFile, "<td><a href=\"#14\">production admin</a></td>\n");
    fs.writeSync(resultsFile, "<tr>\n");
    fs.writeSync(resultsFile, "</table>\n");
    fs.writeSync(resultsFile, "<a href='git-push-log.txt'>log</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<a href='git-update-log.txt'>update-log</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<a href='update_schema_docs.txt'>update_schema_docs</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<a href='json_to_xml.txt'>json_to_xml</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<a href='git-push-out.txt'>out</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<a href='git-push-err.txt'>err</a>&nbsp;\n");
    fs.writeSync(resultsFile, "<script>\n");
    fs.writeSync(resultsFile, "var applicationStatus = {};\n");
    fs.writeSync(resultsFile, "function doUpdate() {\n");
    fs.writeSync(resultsFile, "updateTimer = window.setTimeout(doUpdate, 60000);\n");
    fs.writeSync(resultsFile, "$.getJSON('buildhistory.json?'+new Date().getTime(), function(data) {\n");
    //fs.writeSync(resultsFile, "console.log(data);\n");
    fs.writeSync(resultsFile, "for (var keyString in data.table) {\n");
    //fs.writeSync(resultsFile, "console.log(keyString);\n");
    fs.writeSync(resultsFile, "var experimentRow = document.getElementById(keyString+ '_row');\n");
    fs.writeSync(resultsFile, "if (!experimentRow) {\n");
    fs.writeSync(resultsFile, "var tableRow = document.createElement('tr');\n");
    fs.writeSync(resultsFile, "tableRow.id = keyString+ '_row';\n");
    fs.writeSync(resultsFile, "for (var cellString of ['_repository', '_committer', '_experiment', '_date', '_validation_json_xsd', '_staging_web', '_staging_android', '_staging_desktop', '_staging_admin', '_production_target', '_production_web', '_production_android', '_production_desktop', '_production_admin']) {\n");
    fs.writeSync(resultsFile, "var tableCell = document.createElement('td');\n");
    fs.writeSync(resultsFile, "tableCell.id = keyString + '_' + cellString;\n");
    fs.writeSync(resultsFile, "tableRow.appendChild(tableCell);\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "document.getElementById('buildTable').appendChild(tableRow);\n");
    // check the spring health here and show http and db status via applicationStatus array
    // the path -admin/health is for spring boot 1.4.1
    fs.writeSync(resultsFile, "$.getJSON('" + stagingServerUrl + "/'+keyString+'-admin/health', (function(experimentName) { return function(data) {\n");
    fs.writeSync(resultsFile, "$.each(data, function (key, val) {\n");
    fs.writeSync(resultsFile, "if (key === 'status') {\n");
    fs.writeSync(resultsFile, "if (val === 'UP') {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__staging_admin'] = 'yellow';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__staging_admin'] = 'red';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "};}(keyString)));\n");
    fs.writeSync(resultsFile, "$.getJSON('" + productionServerUrl + "/'+keyString+'-admin/health', (function(experimentName) { return function(data) {\n");
    fs.writeSync(resultsFile, "$.each(data, function (key, val) {\n");
    fs.writeSync(resultsFile, "if (key === 'status') {\n");
    fs.writeSync(resultsFile, "if (val === 'UP') {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__production_admin'] = 'yellow';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__production_admin'] = 'red';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "};}(keyString)));\n");
    // the path -admin/actuator/health is for spring boot 2.3.0
    fs.writeSync(resultsFile, "$.getJSON('" + stagingServerUrl + "/'+keyString+'-admin/actuator/health', (function(experimentName) { return function(data) {\n");
    fs.writeSync(resultsFile, "$.each(data, function (key, val) {\n");
    fs.writeSync(resultsFile, "if (key === 'status') {\n");
    fs.writeSync(resultsFile, "if (val === 'UP') {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__staging_admin'] = 'green';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__staging_admin'] = 'red';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "};}(keyString)));\n");
    fs.writeSync(resultsFile, "$.getJSON('" + productionServerUrl + "/'+keyString+'-admin/actuator/health', (function(experimentName) { return function(data) {\n");
    fs.writeSync(resultsFile, "$.each(data, function (key, val) {\n");
    fs.writeSync(resultsFile, "if (key === 'status') {\n");
    fs.writeSync(resultsFile, "if (val === 'UP') {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__production_admin'] = 'green';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "applicationStatus[experimentName + '__production_admin'] = 'red';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "};}(keyString)));\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "for (var cellString in data.table[keyString]) {\n");
    //fs.writeSync(resultsFile, "console.log(cellString);\n");
    fs.writeSync(resultsFile, "var experimentCell = document.getElementById(keyString + '_' + cellString);\n");
    fs.writeSync(resultsFile, "if (!experimentCell) {\n");
    fs.writeSync(resultsFile, "var tableCell = document.createElement('td');\n");
    fs.writeSync(resultsFile, "tableCell.id = keyString + '_' + cellString;\n");
    fs.writeSync(resultsFile, "document.getElementById(keyString + '_row').appendChild(tableCell);\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "var buildTimeSting = (typeof data.table[keyString][cellString].ms !== 'undefined' && data.table[keyString][cellString].built)? '(' + parseInt(data.table[keyString][cellString].ms / 60000) + ':' + parseInt(data.table[keyString][cellString].ms / 1000 % 60) + ')' : '';\n");
    fs.writeSync(resultsFile, "document.getElementById(keyString + '_' + cellString).innerHTML = data.table[keyString][cellString].value + buildTimeSting;\n");
    //fs.writeSync(resultsFile, "var statusStyle = ($.inArray(keyString + '_' + cellString, applicationStatus ) >= 0)?';border-right: 5px solid green;':';border-right: 5px solid grey;';\n");
    fs.writeSync(resultsFile, "var statusStyle = (keyString + '_' + cellString in applicationStatus)?';border-right: 3px solid ' + applicationStatus[keyString + '_' + cellString] + ';':'';\n");
    fs.writeSync(resultsFile, "document.getElementById(keyString + '_' + cellString).style = data.table[keyString][cellString].style + statusStyle;\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "if (typeof data.memoryTotal === 'undefined' || data.memoryTotal === null) {\n");
    fs.writeSync(resultsFile, "document.getElementById('memoryFree').innerHTML = '';\n");
    fs.writeSync(resultsFile, "document.getElementById('memoryFree').style.width = '0%';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "var memoryFreeValue = Math.floor((data.memoryTotal - data.memoryFree) / data.memoryTotal * 100);\n");
    fs.writeSync(resultsFile, "document.getElementById('memoryFree').innerHTML = memoryFreeValue + '%&nbsp;memory';\n");
    fs.writeSync(resultsFile, "document.getElementById('memoryFree').style.width = memoryFreeValue + '%';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "if (typeof data.diskTotal === 'undefined' || data.diskTotal === null) {\n");
    fs.writeSync(resultsFile, "document.getElementById('diskFree').innerHTML = '';\n");
    fs.writeSync(resultsFile, "document.getElementById('diskFree').style.width = '0%';\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "var diskFreeValue = Math.floor((data.diskTotal - data.diskFree) / data.diskTotal * 100);\n");
    fs.writeSync(resultsFile, "document.getElementById('diskFree').innerHTML = diskFreeValue + '%&nbsp;disk';\n");
    fs.writeSync(resultsFile, "document.getElementById('diskFree').style.width = diskFreeValue + '%';\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "doSort();\n");
    fs.writeSync(resultsFile, "clearTimeout(updateTimer);\n");
    fs.writeSync(resultsFile, "if(data.building){\n");
    fs.writeSync(resultsFile, "updateTimer = window.setTimeout(doUpdate, 1000);\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "updateTimer = window.setTimeout(doUpdate, 10000);\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "var updateTimer = window.setTimeout(doUpdate, 100);\n");
    fs.writeSync(resultsFile, "function doSort() {\n");
    fs.writeSync(resultsFile, "var sortData = location.href.split('#')[1];\n");
    fs.writeSync(resultsFile, "var sortItem = sortData.split('_')[0];\n");
    fs.writeSync(resultsFile, "var sortDirection = sortData.split('_')[1];\n");
    fs.writeSync(resultsFile, "if($.isNumeric(sortItem)){\n");
    fs.writeSync(resultsFile, "if(sortDirection === 'd'){\n");
    fs.writeSync(resultsFile, "$('tr:gt(1)').each(function() {}).sort(function (b, a) {return $('td:nth-of-type('+sortItem+')', a).text().localeCompare($('td:nth-of-type('+sortItem+')', b).text());}).appendTo('tbody');\n");
    fs.writeSync(resultsFile, "$('tr:first').children('td').children('a').each(function(index) {$(this).attr('href', '#' + (index + 1) + '_a')});\n");
    fs.writeSync(resultsFile, "} else {\n");
    fs.writeSync(resultsFile, "$('tr:gt(1)').each(function() {}).sort(function (a, b) {return $('td:nth-of-type('+sortItem+')', a).text().localeCompare($('td:nth-of-type('+sortItem+')', b).text());}).appendTo('tbody');\n");
    fs.writeSync(resultsFile, "$('tr:first').children('td').children('a').each(function(index) {$(this).attr('href', '#' + (index + 1) + '_d')});\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "}\n");
    fs.writeSync(resultsFile, "$(window).on('hashchange', function (e) {\n");
    fs.writeSync(resultsFile, "doSort();\n");
    fs.writeSync(resultsFile, "});\n");
    fs.writeSync(resultsFile, "</script>\n");
    buildHistoryJson.building = true;
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
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
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
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
    }
    buildHistoryJson.table[name]["_" + stage + "_" + type].built = (!isError && !isBuilding && isDone);
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}

function stopUpdatingResults() {
    console.log('build process complete');
    fs.writeSync(resultsFile, "<div>build process complete</div>");
    buildHistoryJson.building = false;
    buildHistoryJson.buildDate = new Date().toISOString();
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}

function unDeploy(currentEntry) {
    console.log("unDeploy");
    var stageStartTime = new Date().getTime();
    console.log("request to unDeploy " + currentEntry.buildName);
    // undeploy staging gui
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">undeploying</a>', "staging", "web", false, true, false);
    var queuedConfigFile = path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml');
    var buildContainerName = currentEntry.buildName + '_undeploy';
    var dockerString = 'sudo docker rm -f ' + buildContainerName
        + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
        + 'sudo docker run'
        + ' --rm '
        + ' --name ' + buildContainerName
        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
        + ' -v processingDirectory:/FrinexBuildService/processing'
        //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate frinexapps:latest /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
        + ' mvn tomcat7:undeploy '
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
        + ' -Dexperiment.webservice=' + configServer
        //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
        + ' -DversionCheck.allowSnapshots=' + 'false'
        + ' -DversionCheck.buildType=' + 'stable'
        + ' -Dexperiment.destinationServer=' + stagingServer
        + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
        //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_web.war'
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
        + '"';
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("staging frinex-gui undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">undeployed</a>', "staging", "web", false, false, false);
    } catch (error) {
        console.error(`staging frinex-gui undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">undeploy error</a>', "staging", "web", true, false, true);
    }
    // undeploy staging admin
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">undeploying</a>', "staging", "admin", false, true, false);
    var dockerString = 'sudo docker rm -f ' + buildContainerName
        + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
        + 'sudo docker run'
        + ' --rm '
        + ' --name ' + buildContainerName
        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
        + ' -v processingDirectory:/FrinexBuildService/processing'
        //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate frinexapps:latest /bin/bash -c "cd /ExperimentTemplate/registration;'
        + ' mvn tomcat7:undeploy '
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
        + ' -Dexperiment.webservice=' + configServer
        //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
        + ' -DversionCheck.allowSnapshots=' + 'false'
        + ' -DversionCheck.buildType=' + 'stable'
        + ' -Dexperiment.destinationServer=' + stagingServer
        + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
        //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
        + '"';
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("staging frinex-admin undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">undeployed</a>', "staging", "admin", false, false, false);
    } catch (error) {
        console.error(`staging frinex-admin undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">undeploy error</a>', "staging", "admin", true, false, true);
    }
    // undeploy production gui
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">undeploying</a>', "production", "web", false, true, false);
    var dockerString = 'sudo docker rm -f ' + buildContainerName
        + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
        + 'sudo docker run'
        + ' --rm '
        + ' --name ' + buildContainerName
        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
        + ' -v processingDirectory:/FrinexBuildService/processing'
        //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate frinexapps:latest /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
        + ' mvn tomcat7:undeploy '
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
        + ' -Dexperiment.webservice=' + configServer
        //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
        + ' -DversionCheck.allowSnapshots=' + 'false'
        + ' -DversionCheck.buildType=' + 'stable'
        + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
            ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
            + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
            : ' -Dexperiment.destinationServer=' + productionServer
            + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
        )
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
        //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_web.war'
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
        + '"';
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("production frinex-gui undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">undeployed</a>', "production", "web", false, false, false);
    } catch (error) {
        console.error(`production frinex-gui undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">undeploy error</a>', "production", "web", true, false, true);
    }
    // undeploy production admin
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">undeploying</a>', "production", "admin", false, true, false);
    var dockerString = 'sudo docker rm -f ' + buildContainerName
        + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
        + 'sudo docker run'
        + ' --rm '
        + ' --name ' + buildContainerName
        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
        + ' -v processingDirectory:/FrinexBuildService/processing'
        //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate frinexapps:latest /bin/bash -c "cd /ExperimentTemplate/registration;'
        + ' mvn tomcat7:undeploy '
        + ' -gs /maven/.m2/settings.xml'
        + ' -DskipTests'
        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
        + ' -Dexperiment.webservice=' + configServer
        //+ ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
        + ' -DversionCheck.allowSnapshots=' + 'false'
        + ' -DversionCheck.buildType=' + 'stable'
        + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
            ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
            + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
            : ' -Dexperiment.destinationServer=' + productionServer
            + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
        )
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
        //+ ' rm /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
        + '"';
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("production frinex-admin undeploy finished");
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">undeployed</a>', "production", "admin", false, false, false);
    } catch (error) {
        console.error(`production frinex-admin undeploy error: ${error}`);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">undeploy error</a>', "production", "admin", true, false, true);
    }
    if (fs.existsSync(queuedConfigFile)) {
        fs.unlinkSync(queuedConfigFile);
    }
    currentlyBuilding.delete(currentEntry.buildName);
}

function deployDockerService(currentEntry, warFileName, serviceName) {
    //const warFilePath = targetDirectory + "/" + currentEntry.buildName + "/" + warFileName;
    const dockerFilePath = targetDirectory + "/" + currentEntry.buildName + "/" + serviceName + ".Docker";
    fs.writeFileSync(dockerFilePath,
        "FROM openjdk:11\n"
        + "COPY " + warFileName + " /" + warFileName + "\n"
        + "CMD [\"java\", \"-jar\", \"/" + warFileName + "\"]\n"
        , { mode: 0o755 });
    const serviceSetupString = "cd " + targetDirectory + "/" + currentEntry.buildName + "\n"
        + "sudo docker build --no-cache -f " + serviceName + ".Docker -t " + dockerRegistry + "/" + serviceName + ":latest .\n"
        // + "docker tag " + serviceName + " " + dockerRegistry + "/" + serviceName + ":latest \n"
        + "sudo docker push " + dockerRegistry + "/" + serviceName + ":latest \n"
        + "sudo docker service create --name " + serviceName + " -d -p 8080 " + dockerRegistry + "/" + serviceName + "\n";
    try {
        execSync(serviceSetupString, { stdio: [0, 1, 2] });
        console.log("deployDockerService " + serviceName + " finished");
        // storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">DockerService</a>', "production", "admin", false, false, false);
    } catch (error) {
        console.error("deployDockerService " + serviceName + " error:" + error);
        // storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">DockerService error</a>', "production", "admin", true, false, true);
    }
}

function deployStagingGui(currentEntry) {
    console.log("deployStagingGui");
    var stageStartTime = new Date().getTime();
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">building</a>', "staging", "web", false, true, false);
    var queuedConfigFile = path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml');
    var stagingConfigFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '.xml');
    if (!fs.existsSync(queuedConfigFile)) {
        console.log("deployStagingGui missing: " + queuedConfigFile);
        storeResult(currentEntry.buildName, 'failed', "staging", "web", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
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
        var dockerString = 'sudo docker rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + 'sudo docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
            + ' /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
            //+ " sed -i 's/-Xmx1g/-Xmx2g/g' pom.xml;"
            + ((currentEntry.state === "draft") ? " sed -i 's|<extraJvmArgs>|<draftCompile>true</draftCompile><extraJvmArgs>|g' pom.xml;" : '')
            + ((currentEntry.state === "draft") ? " sed -i 's|<source|<collapse-all-properties /><source|g' src/main/resources/nl/mpi/tg/eg/ExperimentTemplate.gwt.xml;" : '')
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web_sources.jar;'
            + ' mvn clean '
            + ((currentEntry.isWebApp && deploymentType === 'tomcat') ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl gwt-cordova'
            + ((currentEntry.state === "debug") ? ' -Dgwt.draftCompile=true -Dgwt.extraJvmArgs="-Xmx1024m"' : '')
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' free -h &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;'
            // skipping electron and cordova if this is a draft build
            + ((currentEntry.state === "draft") ? "" : ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip /FrinexBuildService/processing/staging-building/'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip /FrinexBuildService/processing/staging-building/'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-cordova.sh'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-electron.sh'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' mv /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*-stable-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web_sources.jar'
                + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
                + ' chmod a+rwx /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-*.sh;'
                + ' chmod a+rwx /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*;'
                + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web_sources.jar;')
            // end of skipping electron and cordova if this is a draft build
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_web.war'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' chmod a+rwx /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging*;'
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war;'
            //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/staging-building/'
            //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + " chmod a+rwx " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + '"';
        console.log(dockerString);
        exec(dockerString, (error, stdout, stderr) => {
            if (error) {
                console.error(`deployStagingGui error: ${error}`);
            }
            console.log(`deployStagingGui stdout: ${stdout}`);
            console.error(`deployStagingGui stderr: ${stderr}`);
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_web.war")) {
                if (deploymentType === 'docker') {
                    deployDockerService(currentEntry, currentEntry.buildName + '_staging_web.war', currentEntry.buildName + '_staging_web');
                }
                console.log("deployStagingGui finished");
                var browseLabel = ((currentEntry.state === "staging" || currentEntry.state === "production")) ? "browse" : currentEntry.state;
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_web.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '">' + browseLabel + '</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '/TestingFrame.html">robot</a>', "staging", "web", false, false, true, new Date().getTime() - stageStartTime);
                var buildArtifactsJson = { artifacts: {} };
                const buildArtifactsFileName = processingDirectory + '/staging-building/' + currentEntry.buildName + '_staging_artifacts.json';
                if (currentEntry.state === "staging" || currentEntry.state === "production") {
                    //        var successFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                    //        successFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(value, null, 4));
                    //        console.log(targetDirectory);
                    //        console.log(value);
                    buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_staging_web.war";
                    // update artifacts.json
                    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                    // build cordova 
                    if (currentEntry.isAndroid || currentEntry.isiOS) {
                        buildApk(currentEntry, "staging", buildArtifactsJson, buildArtifactsFileName);
                    }
                    if (currentEntry.isDesktop) {
                        buildElectron(currentEntry, "staging", buildArtifactsJson, buildArtifactsFileName);
                    }
                    // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
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
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">failed</a>', "staging", "web", true, false, false);
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
            var cordovaZipFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '-frinex-gui-stable-cordova.zip');
            if (fs.existsSync(cordovaZipFile)) {
                fs.unlinkSync(cordovaZipFile);
            }*/
            /* this file is deleted at the start of the admin build process
            var electronZipFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '-frinex-gui-stable-electron.zip');
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
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">building</a>', "staging", "admin", false, true, false);
    var stagingConfigFile = path.resolve(processingDirectory + '/staging-building', currentEntry.buildName + '.xml');
    //    var stagingAdminConfigFile = path.resolve(processingDirectory + '/staging-admin', currentEntry.buildName + '.xml');
    if (!fs.existsSync(stagingConfigFile)) {
        console.log("deployStagingAdmin missing: " + stagingConfigFile);
        storeResult(currentEntry.buildName, 'failed', "staging", "admin", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
    } else {
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_staging_admin';
        var dockerString = 'sudo docker rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
            + ' /bin/bash -c "cd /ExperimentTemplate/registration;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar;'
            + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip;'
            + ' rm /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip;'
            + ' ls -l ' + targetDirectory + '/' + currentEntry.buildName + ' &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt;'
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            + ((/* currentEntry.isWebApp && this is incorrect, non web apps still need the admin */ deploymentType === 'tomcat') ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl frinex-admin'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable.war ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' mv /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war;'
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar;'
            + " chmod a+rwx " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + '"';
        console.log(dockerString);
        try {
            execSync(dockerString, { stdio: [0, 1, 2] });
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.war")) {
                if (deploymentType === 'docker') {
                    deployDockerService(currentEntry, currentEntry.buildName + '_staging_admin.war', currentEntry.buildName + '_staging_admin');
                }
                console.log("frinex-admin finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "staging", "admin", false, false, true, new Date().getTime() - stageStartTime);
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_staging_admin.war";
                // update artifacts.json
                // save the build artifacts JSON to the httpd directory
                const buildArtifactsTargetFileName = targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_artifacts.json';
                fs.writeFileSync(buildArtifactsTargetFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
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
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
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
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
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
    var stageStartTime = new Date().getTime();
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
    } else {
        var existingDeploymentUrl = ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer : productionServerUrl) + "/" + currentEntry.buildName;
        console.log("existing deployment check: " + existingDeploymentUrl);
        try {
            got.get(existingDeploymentUrl, {responseType: 'text'}).then(response => {
                console.log("statusCode: " + response.statusCode);
                if (response.statusCode !== 404) {
                    console.log("existing frinex-gui production found, aborting build!");
                    console.log(response.statusCode);
                    storeResult(currentEntry.buildName, "existing production found, aborting build!", "production", "web", true, false, false);
                    if (fs.existsSync(productionQueuedFile)) {
                        fs.unlinkSync(productionQueuedFile);
                    }
                    currentlyBuilding.delete(currentEntry.buildName);
                } else {
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">building</a>', "production", "web", false, true, false);
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
                    var dockerString = 'sudo docker rm -f ' + buildContainerName
                        + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + 'sudo docker run'
                        + ' --rm '
                        + ' --name ' + buildContainerName
                        /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
                        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
                        + ' -v processingDirectory:/FrinexBuildService/processing'
                        + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
                        //+ ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
                        + ' -v buildServerTarget:' + targetDirectory
                        + ' -v m2Directory:/maven/.m2/'
                        + ' -w /ExperimentTemplate frinexapps:'
                        + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
                        + ' /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
                        + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war;'
                        + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web_sources.jar;'
                        + ' mvn clean '
                        + ((currentEntry.isWebApp && deploymentType === 'tomcat') ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
                        //+ 'package'
                        + ' -gs /maven/.m2/settings.xml'
                        + ' -DskipTests'
                        //+ ' -pl gwt-cordova'
                        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
                        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
                        + ' -Dexperiment.webservice=' + configServer
                        + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
                        + ' -DversionCheck.allowSnapshots=' + 'false'
                        + ' -DversionCheck.buildType=' + 'stable'
                        + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                            ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                            + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                            + ' -Dexperiment.groupsSocketUrl=ws://' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                            : ' -Dexperiment.destinationServer=' + productionServer
                            + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
                            + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
                        )
                        + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
                        + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
                        + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
                        + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
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
                        //+ ' chmod a+rwx /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production*;'
                        + ' chmod a+rwx /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-*.sh;'
                        + ' chmod a+rwx /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*;'
                        + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war;'
                        + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web_sources.jar;'
                        //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/production-building/'
                        //+ " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + '"';
                    console.log(dockerString);
                    exec(dockerString, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`deployProductionGui error: ${error}`);
                        }
                        console.log(`deployProductionGui stdout: ${stdout}`);
                        console.error(`deployProductionGui stderr: ${stderr}`);
                        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_web.war")) {
                            if (deploymentType === 'docker') {
                                deployDockerService(currentEntry, currentEntry.buildName + '_production_web.war', currentEntry.buildName + '_production_web');
                            }
                            console.log("deployProductionGui finished: " + currentEntry.buildName);
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_web.war">download</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer + '/' : 'https://frinexproduction.mpi.nl/') + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true, new Date().getTime() - stageStartTime);
                            var buildArtifactsJson = { artifacts: {} };
                            const buildArtifactsFileName = processingDirectory + '/production-building/' + currentEntry.buildName + '_production_artifacts.json';
                            buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_production_web.war";
                            // update artifacts.json
                            fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                            // build cordova 
                            if (currentEntry.isAndroid || currentEntry.isiOS) {
                                buildApk(currentEntry, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            if (currentEntry.isDesktop) {
                                buildElectron(currentEntry, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
                            deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
                        } else {
                            //console.log(targetDirectory);
                            //console.log(JSON.stringify(reason, null, 4));
                            console.log("deployProductionGui failed: " + currentEntry.buildName);
                            console.log(currentEntry.experimentDisplayName);
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">failed</a>', "production", "web", true, false, false);
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
            }).catch(error => {
                console.log("existing frinex-gui production unknown, aborting build: " + currentEntry.buildName);
                console.log(error.message);
                if (fs.existsSync(productionQueuedFile)) {
                    if (retryCounter > 0) {
                        retryCounter--;
                        storeResult(currentEntry.buildName, "retry", "production", "web", false, true, false);
                        deployProductionGui(currentEntry, retryCounter);
                    } else {
                        storeResult(currentEntry.buildName, "network error", "production", "web", true, false, false);
                        fs.unlinkSync(productionQueuedFile);
                        currentlyBuilding.delete(currentEntry.buildName);
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
        }
    }
}

function deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName) {
    var stageStartTime = new Date().getTime();
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">building</a>', "production", "admin", false, true, false);
    var productionConfigFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '.xml');
    //    var productionAdminConfigFile = path.resolve(processingDirectory + '/production-admin', currentEntry.buildName + '.xml');
    if (!fs.existsSync(productionConfigFile)) {
        console.log("deployProductionAdmin missing: " + productionConfigFile);
        storeResult(currentEntry.buildName, 'failed', "production", "admin", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
    } else {
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_production_admin';
        var dockerString = 'sudo docker rm -f ' + buildContainerName
            + " &> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + 'sudo docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            //+ ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:' + targetDirectory
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
            + ' /bin/bash -c "cd /ExperimentTemplate/registration;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar;'
            + ' rm /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip;'
            + ' rm /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip;'
            + ' ls -l ' + targetDirectory + '/' + currentEntry.buildName + ' &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt;'
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            + ((/* currentEntry.isWebApp && this is incorrect, non web apps still need the admin */ deploymentType === 'tomcat') ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            //+ 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl frinex-admin'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
            + ' -Dexperiment.artifactsJsonDirectory=' + targetDirectory + '/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -DversionCheck.buildType=' + 'stable'
            + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ?
                ' -Dexperiment.destinationServer=' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                + ' -Dexperiment.destinationServerUrl=' + currentEntry.productionServer
                + ' -Dexperiment.groupsSocketUrl=ws://' + currentEntry.productionServer.replace(/^https?:\/\//, '')
                : ' -Dexperiment.destinationServer=' + productionServer
                + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
                + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
            )
            + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            //+ ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            //+ ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable.war ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' mv /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable-sources.jar ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar'
            + " &>> " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war;'
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar;'
            + " chmod a+rwx " + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + '"';
        console.log(dockerString);
        try {
            execSync(dockerString, { stdio: [0, 1, 2] });
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.war")) {
                if (deploymentType === 'docker') {
                    deployDockerService(currentEntry, currentEntry.buildName + '_production_admin.war', currentEntry.buildName + '_production_admin');
                }
                console.log("frinex-admin finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war">download</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer + '/' : 'https://frinexproduction.mpi.nl/') + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="' + ((currentEntry.productionServer != null && currentEntry.productionServer.length > 0) ? currentEntry.productionServer + '/' : 'https://frinexproduction.mpi.nl/') + currentEntry.buildName + '-admin/monitoring">monitor</a>', "production", "admin", false, false, true, new Date().getTime() - stageStartTime);
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_production_admin.war";
                // update artifacts.json
                // save the build artifacts JSON to the httpd directory
                const buildArtifactsTargetFileName = targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_artifacts.json';
                fs.writeFileSync(buildArtifactsTargetFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                if (fs.existsSync(productionConfigFile)) {
                    fs.unlinkSync(productionConfigFile);
                }
                if (fs.existsSync(buildArtifactsFileName)) {
                    fs.unlinkSync(buildArtifactsFileName);
                }
                currentlyBuilding.delete(currentEntry.buildName);
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
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
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
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
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
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_android.txt" + '">log</a>&nbsp;';
        storeResult(currentEntry.buildName, "building " + resultString, stage, "android", false, true, false);
        // we do not build in the docker volume because it would create redundant file synchronisation.
        var dockerString = 'sudo docker rm -f ' + currentEntry.buildName + '_' + stage + '_cordova;'
            + 'sudo docker run --name ' + currentEntry.buildName + '_' + stage + '_cordova --rm'
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:' + targetDirectory
            + ' frinexapps:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
            + ' /bin/bash -c "'
            + ' rm ' + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_cordova.apk &>> " + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' rm ' + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_cordova.zip &>> " + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' rm ' + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_android.zip &>> " + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' rm ' + targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_" + stage + "_ios.zip &>> " + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' mkdir /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '_setup-cordova.sh /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' bash /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '_setup-cordova.sh &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' ls /FrinexBuildService/cordova-' + stage + '-build/* &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/app-release.apk ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.apk &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-cordova.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-android.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-stable-ios.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_ios.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_android.txt;'
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_cordova.*;'
            + '"';
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
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
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
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
        resultString += '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + "_" + stage + "_electron.txt" + '">log</a>&nbsp;';
        storeResult(currentEntry.buildName, "building " + resultString, stage, "desktop", false, true, false);
        var dockerString = 'sudo docker rm -f ' + currentEntry.buildName + '_' + stage + '_electron;'
            + 'sudo docker run --name ' + currentEntry.buildName + '_' + stage + '_electron --rm'
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:' + targetDirectory
            + ' frinexapps:'
            + ((currentEntry.frinexVersion != null && currentEntry.frinexVersion.length > 0) ? currentEntry.frinexVersion : 'latest')
            + ' /bin/bash -c "'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-ia32.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_linux-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '.asar &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' rm ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '.dmg &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' mkdir /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '_setup-electron.sh /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' mv /FrinexBuildService/processing/' + stage + '-building/' + currentEntry.buildName + '-frinex-gui-*-stable-electron.zip /FrinexBuildService/electron-' + stage + '-build/ &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' bash /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '_setup-electron.sh &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' ls /FrinexBuildService/electron-' + stage + '-build/* &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '_' + stage + '_electron.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-win32-ia32.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-ia32.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-win32-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_win32-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-darwin-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_darwin-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + currentEntry.buildName + '-frinex-gui-*-linux-x64.zip ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_linux-x64.zip &>> ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_electron.txt;'
            + ' chmod a+rwx ' + targetDirectory + '/' + currentEntry.buildName + '/' + currentEntry.buildName + '_' + stage + '_*.zip;'
            + '"';
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
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
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
}

function buildNextExperiment() {
    while (listingMap.size > 0 && currentlyBuilding.size < concurrentBuildCount) {
        const currentKey = listingMap.keys().next().value;
        console.log('buildNextExperiment: ' + currentKey);
        //fs.writeSync(resultsFile, "buildNextExperiment: " + currentKey + "</div>");
        const currentEntry = listingMap.get(currentKey);
        if (currentlyBuilding.has(currentEntry.buildName)) {
            console.log("waiting rebuild: " + currentEntry.buildName);
            storeResult(currentKey, 'waiting rebuild', "staging", "web", true, false, false);
        } else {
            currentlyBuilding.set(currentEntry.buildName, currentEntry);
            listingMap.delete(currentKey);
            //console.log("starting generate stimulus");
            //execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
            if (currentEntry.state === "draft" || currentEntry.state === "debug" || currentEntry.state === "staging" || currentEntry.state === "production") {
                deployStagingGui(currentEntry);
            } else if (currentEntry.state === "undeploy") {
                // todo: undeploy probably does not need to be limited by concurrentBuildCount
                unDeploy(currentEntry);
            } else {
                console.log("nothing to do for: " + currentEntry.buildName);
                currentlyBuilding.delete(currentEntry.buildName);
                fs.unlinkSync(path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml'));
            }
        }
    }
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
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '_validation_error.txt">failed</a>&nbsp;';
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
                        storeResult(fileNamePart, 'restarting build', "staging", "web", false, false, false);
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
                            // this move is within the same volume so we can do it this easy way
                            fs.renameSync(queuedConfigFile, stagingQueuedConfigFile);

                            // keeping the listing entry in a map so only one can exist for any experiment regardless of mid compilation rebuild requests
                            console.log('jsonListing: ' + buildName);
                            //fs.writeSync(resultsFile, "<div>jsonListing: " + buildName + "</div>");
                            var listingJsonData = JSON.parse(fs.readFileSync(listingFile, 'utf8'));
                            listingJsonData.buildName = buildName;
                            console.log('listingJsonData: ' + JSON.stringify(listingJsonData));
                            fs.unlinkSync(listingFile);
                            listingMap.set(buildName, listingJsonData);
                            storeResult(fileNamePart, '', "staging", "web", false, false, false);
                            storeResult(fileNamePart, '', "staging", "admin", false, false, false);
                            storeResult(fileNamePart, '', "staging", "android", false, false, false);
                            storeResult(fileNamePart, '', "staging", "desktop", false, false, false);
                            storeResult(fileNamePart, '', "production", "target", false, false, false);
                            storeResult(fileNamePart, '', "production", "web", false, false, false);
                            storeResult(fileNamePart, '', "production", "admin", false, false, false);
                            storeResult(fileNamePart, '', "production", "android", false, false, false);
                            storeResult(fileNamePart, '', "production", "desktop", false, false, false);
                            if (listingJsonData.state === "staging" || listingJsonData.state === "production") {
                                storeResult(listingJsonData.buildName, 'queued', "staging", "web", false, false, false);
                                storeResult(listingJsonData.buildName, 'queued', "staging", "admin", false, false, false);
                                if (listingJsonData.isAndroid) {
                                    storeResult(listingJsonData.buildName, 'queued', "staging", "android", false, false, false);
                                }
                                if (listingJsonData.isDesktop) {
                                    storeResult(listingJsonData.buildName, 'queued', "staging", "desktop", false, false, false);
                                }
                                if (deploymentType === 'docker') {
                                    got.get("http://frinex_db_manager/cgi/frinex_db_manager.cgi?frinex_" + buildName + "_db", {responseType: 'text'}).then(response => {
                                        console.log("frinex_db_manager: " + buildName + " : " + response.statusCode);
                                    }).catch(error => {
                                        console.log("frinex_db_manager: " + buildName + " : " + error);
                                    });
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
                                    storeResult(fileNamePart, listingJsonData.productionServer, "production", "target", false, false, false);
                                } else {
                                    storeResult(fileNamePart, productionServerUrl, "production", "target", false, false, false);
                                }
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
    var incomingReadStream = fs.createReadStream(incomingFile);
    incomingReadStream.on('close', function () {
        if (fs.existsSync(incomingFile)) {
            fs.unlinkSync(incomingFile);
            console.log('removed: ' + incomingFile);
            //fs.writeSync(resultsFile, "<div>removed: " + incomingFile + "</div>");
        }
    });
    incomingReadStream.pipe(fs.createWriteStream(targetFile));
    } catch (reason) {
        console.error("copyDeleteFile failed: " + incomingFile + ":" + targetFile + ":" + reason);
    }
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
            console.log('configStoreFile: ' + configStoreFile);
            //fs.writeSync(resultsFile, "<div>copying XML from queued to target: " + filename + "</div>");
            // this move is not within the same volume
            //copyFileSync(incomingFile, configStoreFile);
            console.log('moving XML from validated to queued: ' + filename);
            // this move is within the same volume so we can do it this easy way
            fs.renameSync(incomingFile, configQueuedFile);
            //fs.writeSync(resultsFile, "<div>copied XML from validated to queued: " + filename + "</div>");
            console.log('copying XML from queued to target: ' + filename);
            fs.createReadStream(configQueuedFile).pipe(fs.createWriteStream(configStoreFile));
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

function checkForDuplicates(currentName) {
    console.log("checkForDuplicates: " + currentName);
    var experimentConfigCounter = 0;
    var experimentConfigLocations = "";
    // iterate all git repositories checking for duplicate files of XML or JSON regardless of case
    var repositoriesList = fs.readdirSync("/FrinexBuildService/git-checkedout");
    for (var repositoryDirectory of repositoriesList) {
        //console.log(repositoryDirectory);
        var repositoryDirectoryPath = path.resolve("/FrinexBuildService/git-checkedout", repositoryDirectory);
        var repositoryEntries = fs.readdirSync(repositoryDirectoryPath);
        for (var repositoryEntry of repositoryEntries) {
            //console.log(repositoryEntry);
            var lowercaseEntry = repositoryEntry.toLowerCase();
            //console.log(fileNamePart);
            if (currentName + ".json" === lowercaseEntry || currentName + ".xml" === lowercaseEntry) {
                experimentConfigCounter++;
                experimentConfigLocations += repositoryEntry + " found in /git/" + repositoryDirectory + ".git" + "\n";
                console.log(repositoryEntry + " found in /git/" + repositoryDirectory + ".git");
            }
        }
    }
    var configErrorPath = path.resolve(targetDirectory + "/" + currentName + "/" + currentName + "_conflict_error.txt");
    if (experimentConfigCounter > 1) {
        //console.log(experimentConfigLocations);
        const queuedConfigFile = fs.openSync(configErrorPath, "w");
        fs.writeSync(queuedConfigFile, "Multiple configuration files found in the following locations:\n" + experimentConfigLocations);
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
                    console.log('moveIncomingToQueued: hasProcessingFiles');
                    //fs.writeSync(resultsFile, "<div>has more files in processing</div>");
                    prepareForProcessing();
                    setTimeout(moveIncomingToQueued, 3000);
                } else if (!hasDoneBackup) {
                    // this exit backup process takes too long when a new commit comes in and needs to be built
                    console.log("pre exit backup disabled");
                    /*console.log("pre exit backup");
                    try {
                        execSync('rsync -a --no-perms --no-owner --no-group --no-times ' + targetDirectory + '/ /BackupFiles/buildartifacts; rsync -a --no-perms --no-owner --no-group --no-times /FrinexBuildService/git-repositories /BackupFiles/ &> ' + targetDirectory + '/backup.log;', { stdio: [0, 1, 2] });
                    } catch (reason) {
                        console.error("check backup.log for messages");
                        console.error(reason);
                    }*/
                    hasDoneBackup = true;
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
                        if (!fs.existsSync(targetDirectory + "/" + currentName)) {
                            fs.mkdirSync(targetDirectory + '/' + currentName);
                        }
                        if (path.extname(lowerCaseFileName) === ".commit") {
                            // the committer info is used when the XML or JSON file is processed
                        } else if (checkForDuplicates(currentName) !== 1) {
                            // the locations of the conflicting configuration files is listed in the error file _conflict_error.txt so we link it here in the message
                            initialiseResult(currentName, '<a class="shortmessage" href="' + currentName + '/' + currentName + '_conflict_error.txt">conflict<span class="longmessage">Two or more configuration files of the same name exist for this experiment and as a precaution this experiment will not compile until this error is resovled.</span></a>', true, '', '');
                            console.log("this script will not build when two or more configuration files of the same name are found.");
                            fs.writeSync(resultsFile, "<div>conflict: '" + currentName + "'</div>");
                            if (fs.existsSync(incomingFile)) {
                                fs.unlinkSync(incomingFile);
                            }
                        } else if ((path.extname(lowerCaseFileName) === ".json" || path.extname(lowerCaseFileName) === ".xml") && lowerCaseFileName !== "listing.json") {
                            fs.writeSync(resultsFile, "<div>initialise: '" + lowerCaseFileName + "'</div>");
                            console.log('initialise: ' + lowerCaseFileName);
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
                                    execSync('sudo docker rm -f ' + currentName + '_staging_web ' + currentName + '_staging_admin ' + currentName + '_staging_cordova ' + currentName + '_staging_electron', { stdio: [0, 1, 2] });
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
                                    execSync('sudo docker rm -f ' + currentName + '_production_web ' + currentName + '_production_admin ' + currentName + '_production_cordova ' + currentName + '_production_electron', { stdio: [0, 1, 2] });
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
                            } catch (error) {
                                console.error('failed to parse commit info: ' + error);
                            }
                            if (fs.existsSync(incomingFile + ".commit")) {
                                fs.unlinkSync(incomingFile + ".commit");
                                console.log('deleted parsed commit info file: ' + incomingFile + ".commit");
                            }
                            initialiseResult(currentName, 'validating', false, repositoryName, committerName);
                            //if (fs.existsSync(targetDirectory + "/" + currentName)) {
                            // todo: consider if this agressive removal is always wanted
                            // todo: we might want this agressive target experiment name directory removal to prevent old output being served out
                            //    fs.rmdirSync(targetDirectory + "/" + currentName, { recursive: true });
                            //}
                            // this move is within the same volume so we can do it this easy way
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
                buildNextExperiment(); // if there are existing experiments in the build queue they can be started before converting more with JsonToXml
                if (foundFilesCount > 0) {
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
    var dockerString = 'sudo docker rm -f json_to_xml'
        + ' &> ' + targetDirectory + '/json_to_xml.txt;'
        + 'sudo docker run --rm'
        //+ ' --user "$(id -u):$(id -g)"'
        + ' --name json_to_xml'
        + ' -v incomingDirectory:/FrinexBuildService/incoming'
        + ' -v processingDirectory:/FrinexBuildService/processing'
        + ' -v listingDirectory:/FrinexBuildService/listing'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        + ' frinexapps:latest /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml /FrinexBuildService/incoming/queued /FrinexBuildService/processing/validated /FrinexBuildService/listing ' + targetDirectory /* the schema file is in the target directory, however it might be nicer to use a dedicated directory when we support multiple schema/build versions */ + '\\"'
        + ' &>> ' + targetDirectory + '/json_to_xml.txt;'
        + ' chmod a+rwx /FrinexBuildService/processing/validated/* /FrinexBuildService/listing/*'
        + ' &>> ' + targetDirectory + '/json_to_xml.txt;"';
    //+ " &> " + targetDirectory + "/JsonToXml_" + new Date().toISOString() + ".txt";
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
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
    // extract the latest versions of frinex.xml frinex.xsd and minimal_example.xml from the frinexapps:latest image that is currently in use
    var dockerString = 'sudo docker rm -f update_schema_docs'
        + ' &> ' + targetDirectory + '/update_schema_docs.txt;'
        + 'sudo docker run --rm'
        + ' --name update_schema_docs'
        + ' -v buildServerTarget:' + targetDirectory
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        + ' frinexapps:latest /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.DocumentationGenerator ' + targetDirectory + /*'/FrinexBuildService/docs '*/ ' ' + targetDirectory + '\\"'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod a+rwx ' + targetDirectory + '/minimal_example.xml'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod a+rwx ' + targetDirectory + '/frinex.html'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;'
        + ' chmod a+rwx ' + targetDirectory + '/frinex.xsd'
        + ' &>> ' + targetDirectory + '/update_schema_docs.txt;"';
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("update_schema_docs finished");
    } catch (reason) {
        console.error(reason);
        console.error("update_schema_docs failed");
    };
}

function prepareBuildHistory() {
    if (fs.existsSync(buildHistoryFileName)) {
        try {
            var buildHistoryJsonTemp = JSON.parse(fs.readFileSync(buildHistoryFileName, 'utf8'));
            fs.writeFileSync(buildHistoryFileName + ".temp", JSON.stringify(buildHistoryJsonTemp, null, 4), { mode: 0o755 });
            var now = new Date();
            var datedFileSuffix = '-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
            fs.writeFileSync(buildHistoryFileName + datedFileSuffix, JSON.stringify(buildHistoryJsonTemp, null, 4), { mode: 0o755 });
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
            // remember the last free disk
            buildHistoryJson.diskFree = buildHistoryJsonTemp.diskFree;
            buildHistoryJson.diskTotal = buildHistoryJsonTemp.diskTotal;
            // request the current free disk
            diskSpace('/').then((info) => {
                buildHistoryJson.diskFree = info.free;
                buildHistoryJson.diskTotal = info.size;
            });
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
        fs.rmdirSync(currentDirectoryPath, { recursive: true });
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
            fs.rmdirSync(currentDirectoryPath, { recursive: true });
        }
    }
    prepareBuildHistory();
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
