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
const https = require('https');
const fs = require('fs');
const path = require('path');
const m2Settings = properties.get('settings.m2Settings');
const concurrentBuildCount = properties.get('settings.concurrentBuildCount');
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

const resultsFile = fs.createWriteStream(targetDirectory + "/index.html", { flags: 'w', mode: 0o755 });
const listingMap = new Map();
const currentlyBuilding = new Map();
const buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildHistoryJson = { table: {} };
if (fs.existsSync(buildHistoryFileName)) {
    try {
        buildHistoryJson = JSON.parse(fs.readFileSync(buildHistoryFileName, 'utf8'));
        fs.writeFileSync(buildHistoryFileName + ".temp", JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
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
    resultsFile.write("<a href='json_to_xml.txt'>json_to_xml</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-out.txt'>out</a>&nbsp;\n");
    resultsFile.write("<a href='git-push-err.txt'>err</a>&nbsp;\n");
    resultsFile.write("<script>\n");
    resultsFile.write("var applicationStatus = {};\n");
    resultsFile.write("function doUpdate() {\n");
    resultsFile.write("$.getJSON('buildhistory.json?'+new Date().getTime(), function(data) {\n");
    //resultsFile.write("console.log(data);\n");
    resultsFile.write("for (var keyString in data.table) {\n");
    //resultsFile.write("console.log(keyString);\n");
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
    //resultsFile.write("console.log(cellString);\n");
    resultsFile.write("var experimentCell = document.getElementById(keyString + '_' + cellString);\n");
    resultsFile.write("if (!experimentCell) {\n");
    resultsFile.write("var tableCell = document.createElement('td');\n");
    resultsFile.write("tableCell.id = keyString + '_' + cellString;\n");
    resultsFile.write("document.getElementById(keyString + '_row').appendChild(tableCell);\n");
    resultsFile.write("}\n");
    resultsFile.write("document.getElementById(keyString + '_' + cellString).innerHTML = data.table[keyString][cellString].value;\n");
    //resultsFile.write("var statusStyle = ($.inArray(keyString + '_' + cellString, applicationStatus ) >= 0)?';border-right: 5px solid green;':';border-right: 5px solid grey;';\n");
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
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}


function initialiseResult(name, message, isError) {
    var style = '';
    if (isError) {
        style = 'background: #F3C3C3';
    }
    buildHistoryJson.table[name] = {
        "_experiment": { value: name, style: '' },
        "_date": { value: message, style: style },
        //"_validation_link_json": {value: '', style: ''},
        //"_validation_link_xml": {value: '', style: ''},
        "_validation_json_xsd": { value: '', style: '' },
        "_staging_web": { value: '', style: '' },
        "_staging_android": { value: '', style: '' },
        "_staging_desktop": { value: '', style: '' },
        "_staging_admin": { value: '', style: '' },
        "_production_web": { value: '', style: '' },
        "_production_android": { value: '', style: '' },
        "_production_desktop": { value: '', style: '' },
        "_production_admin": { value: '', style: '' }
    };
    // todo: remove any listing.json
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}

function storeResult(name, message, stage, type, isError, isBuilding, isDone) {
    buildHistoryJson.table[name]["_date"].value = new Date().toISOString();
    //buildHistoryJson.table[name]["_date"].value = '<a href="' + currentEntry.buildName + '/' + name + '.xml">' + new Date().toISOString() + '</a>';
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
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}

function stopUpdatingResults() {
    console.log('Build process complete');
    resultsFile.write("<div>Build process complete</div>");
    buildHistoryJson.building = false;
    buildHistoryJson.buildDate = new Date().toISOString();
    fs.writeFileSync(buildHistoryFileName, JSON.stringify(buildHistoryJson, null, 4), { mode: 0o755 });
}

function unDeploy(currentEntry) {
    console.log("unDeploy");
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
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-admin undeploy failed");
                    console.log(currentEntry.experimentDisplayName);
                    storeResult(currentEntry.buildName, 'undeploy failed', "production", "admin", true, false, false);
                });
            }, function (reason) {
                console.log(reason);
                console.log("frinex-gui undeploy failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, 'undeploy failed', "staging", "web", true, false, false);
            });
        }, function (reason) {
            console.log(reason);
            console.log("frinex-admin undeploy failed");
            console.log(currentEntry.experimentDisplayName);
            storeResult(currentEntry.buildName, 'undeploy failed', "staging", "admin", true, false, false);
        });
    }, function (reason) {
        console.log(reason);
        console.log("frinex-gui undeploy failed");
        console.log(currentEntry.experimentDisplayName);
        storeResult(currentEntry.buildName, 'undeploy failed', "staging", "web", true, false, false);
    });
    currentlyBuilding.delete(currentEntry.buildName);
}

function deployStagingGui(currentEntry) {
    console.log("deployStagingGui");
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
        var dockerString = 'docker stop ' + buildContainerName
            + " &> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + 'docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
            + ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:/usr/local/apache2/htdocs'
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
            + ' mvn clean '
            //+ ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            + 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl gwt-cordova'
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
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' mv /ExperimentTemplate/gwt-cordova/target/*.zip /FrinexBuildService/processing/staging-building/'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' mv /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-cordova.sh;'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' mv /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-electron.sh;'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' mv /ExperimentTemplate/gwt-cordova/target/*.jar /FrinexBuildService/processing/staging-building/'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' chmod a+rwx /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging*;'
            + ' chmod a+rwx /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '_setup-*.sh;'
            + ' chmod a+rwx /FrinexBuildService/processing/staging-building/' + currentEntry.buildName + '-frinex-gui-*;'
            + ' chmod a+rwx /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.war;'
            //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/staging-building/'
            //+ " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + " chmod a+rwx /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + '"';
        console.log(dockerString);
        exec(dockerString, (error, stdout, stderr) => {
            if (error) {
                console.error(`deployStagingGui error: ${error}`);
            }
            console.log(`deployStagingGui stdout: ${stdout}`);
            console.error(`deployStagingGui stderr: ${stderr}`);
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.war")) {
                console.log("deployStagingGui finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '/TestingFrame.html">robot</a>', "staging", "web", false, false, true);
                var buildArtifactsJson = { artifacts: {} };
                const buildArtifactsFileName = processingDirectory + '/staging-building/' + currentEntry.buildName + '_staging_artifacts.json';
                //        var successFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                //        successFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(value, null, 4));
                //        console.log(targetDirectory);
                //        console.log(value);
                buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_staging.war";
                // update artifacts.json
                fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                // build cordova 
                if (currentEntry.isAndroid || currentEntry.isiOS) {
                    buildApk(currentEntry.buildName, "staging", buildArtifactsJson, buildArtifactsFileName);
                }
                if (currentEntry.isDesktop) {
                    buildElectron(currentEntry.buildName, "staging", buildArtifactsJson, buildArtifactsFileName);
                }
                // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
                deployStagingAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
            } else {
                //console.log(targetDirectory);
                //console.log(JSON.stringify(reason, null, 4));
                console.log("deployStagingGui failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">failed</a>', "staging", "web", true, false, false);
                //var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                //errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
                currentlyBuilding.delete(currentEntry.buildName);
            };
        });
    }
}

function deployStagingAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName) {
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
        fs.unlinkSync(stagingConfigFile);
    } else {
        //  terminate existing docker containers by name 
        var buildContainerName = currentEntry.buildName + '_staging_admin';
        var dockerString = 'docker stop ' + buildContainerName
            + " &> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + 'docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v webappsTomcatStaging:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:/usr/local/apache2/htdocs'
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps /bin/bash -c "cd /ExperimentTemplate/registration;'
            + ' ls -l /usr/local/apache2/htdocs/' + currentEntry.buildName + ' &>> /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt;'
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            //+ ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            + 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl frinex-admin'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/staging-building'
            + ' -Dexperiment.artifactsJsonDirectory=/usr/local/apache2/htdocs/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + stagingServer
            + ' -Dexperiment.destinationServerUrl=' + stagingServerUrl
            + ' -Dexperiment.groupsSocketUrl=' + stagingGroupsSocketUrl
            + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlStaging
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable-sources.jar /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' chmod a+rwx /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war;'
            + ' chmod a+rwx /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin_sources.jar;'
            + " chmod a+rwx /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + '"';
        console.log(dockerString);
        try {
            execSync(dockerString, { stdio: [0, 1, 2] });
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.war")) {
                console.log("frinex-gui finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "staging", "admin", false, false, true);
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_staging_admin.war";
                // update artifacts.json
                fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                console.log("deployStagingAdmin ended");
                if (currentEntry.state === "production") {
                    var productionQueuedFile = path.resolve(processingDirectory + '/production-queued', currentEntry.buildName + '.xml');
                    // this move is within the same volume so we can do it this easy way
                    fs.renameSync(stagingConfigFile, productionQueuedFile);
                    deployProductionGui(currentEntry);
                } else {
                    currentlyBuilding.delete(currentEntry.buildName);
                    fs.unlinkSync(stagingConfigFile);
                }
            } else {
                console.log("deployStagingAdmin failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
                currentlyBuilding.delete(currentEntry.buildName);
                fs.unlinkSync(stagingConfigFile);
            };
        } catch (error) {
            console.error('deployStagingAdmin error: ' + error);
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
            currentlyBuilding.delete(currentEntry.buildName);
            fs.unlinkSync(stagingConfigFile);
        }
    }
}

function deployProductionGui(currentEntry) {
    console.log("deployProductionGui started");
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt", 'w'));
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">building</a>', "production", "web", false, true, false);
    var productionQueuedFile = path.resolve(processingDirectory + '/production-queued', currentEntry.buildName + '.xml');
    var productionConfigFile = path.resolve(processingDirectory + '/production-building', currentEntry.buildName + '.xml');
    if (!fs.existsSync(productionQueuedFile)) {
        console.log("deployProductionGui missing: " + productionQueuedFile);
        storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
        currentlyBuilding.delete(currentEntry.buildName);
    } else {
        console.log("existing deployment check: " + productionServerUrl + '/' + currentEntry.buildName);
        try {
            https.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
                console.log("statusCode: " + response.statusCode);
                if (response.statusCode !== 404) {
                    console.log("existing frinex-gui production found, aborting build!");
                    console.log(response.statusCode);
                    storeResult(currentEntry.buildName, "existing production found, aborting build!", "production", "web", true, false, false);
                    fs.unlinkSync(productionConfigFile);
                    currentlyBuilding.delete(currentEntry.buildName);
                } else {
                    if (fs.existsSync(productionConfigFile)) {
                        console.log("deployProductionGui found: " + productionConfigFile);
                        console.log("deployProductionGui if another process already building it will be terminated: " + currentEntry.buildName);
                        fs.unlinkSync(productionConfigFile);
                    }
                    // this move is within the same volume so we can do it this easy way
                    fs.renameSync(productionQueuedFile, productionConfigFile);
                    //  terminate existing docker containers by name 
                    var buildContainerName = currentEntry.buildName + '_production_web';
                    var dockerString = 'docker stop ' + buildContainerName
                        + " &> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + 'docker run'
                        + ' --rm '
                        + ' --name ' + buildContainerName
                        /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
                        // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
                        + ' -v processingDirectory:/FrinexBuildService/processing'
                        + ' -v incomingDirectory:/FrinexBuildService/incoming' // required for static files only
                        + ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
                        + ' -v buildServerTarget:/usr/local/apache2/htdocs'
                        + ' -v m2Directory:/maven/.m2/'
                        + ' -w /ExperimentTemplate frinexapps /bin/bash -c "cd /ExperimentTemplate/gwt-cordova;'
                        + ' mvn clean '
                        //+ ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
                        + 'package'
                        + ' -gs /maven/.m2/settings.xml'
                        + ' -DskipTests'
                        //+ ' -pl gwt-cordova'
                        + ' -Dexperiment.configuration.name=' + currentEntry.buildName
                        + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
                        + ' -Dexperiment.webservice=' + configServer
                        + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
                        + ' -DversionCheck.allowSnapshots=' + 'false'
                        + ' -DversionCheck.buildType=' + 'stable'
                        + ' -Dexperiment.destinationServer=' + productionServer
                        + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
                        + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
                        + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
                        + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
                        + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/*.zip /FrinexBuildService/processing/production-building/'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/setup-cordova.sh /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-cordova.sh;'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/setup-electron.sh /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-electron.sh;'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' mv /ExperimentTemplate/gwt-cordova/target/*.jar /FrinexBuildService/processing/production-building/'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production.war'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.war'
                        + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        //+ ' chmod a+rwx /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production*;'
                        + ' chmod a+rwx /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '_setup-*.sh;'
                        + ' chmod a+rwx /FrinexBuildService/processing/production-building/' + currentEntry.buildName + '-frinex-gui-*;'
                        + ' chmod a+rwx /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.war;'
                        //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/production-building/'
                        //+ " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt;"
                        + '"';
                    console.log(dockerString);
                    exec(dockerString, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`deployProductionGui error: ${error}`);
                        }
                        console.log(`deployProductionGui stdout: ${stdout}`);
                        console.error(`deployProductionGui stderr: ${stderr}`);
                        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.war")) {
                            console.log("deployProductionGui finished");
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true);
                            var buildArtifactsJson = { artifacts: {} };
                            const buildArtifactsFileName = processingDirectory + '/production-building/' + currentEntry.buildName + '_production_artifacts.json';
                            buildArtifactsJson.artifacts['web'] = currentEntry.buildName + "_production.war";
                            // update artifacts.json
                            fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                            // build cordova 
                            if (currentEntry.isAndroid || currentEntry.isiOS) {
                                buildApk(currentEntry.buildName, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            if (currentEntry.isDesktop) {
                                buildElectron(currentEntry.buildName, "production", buildArtifactsJson, buildArtifactsFileName);
                            }
                            // before admin is compliled web, apk, and desktop must be built (if they are going to be), because the artifacts of those builds are be included in admin for user download
                            deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName);
                        } else {
                            //console.log(targetDirectory);
                            //console.log(JSON.stringify(reason, null, 4));
                            console.log("deployProductionGui failed");
                            console.log(currentEntry.experimentDisplayName);
                            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">failed</a>', "production", "web", true, false, false);
                            //var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_production.html", {flags: 'w'});
                            //errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
                            currentlyBuilding.delete(currentEntry.buildName);
                            fs.unlinkSync(productionConfigFile);
                        };
                    });
                }
            }).on('error', function (error) {
                console.log("existing frinex-gui production unknown, aborting build!");
                console.log(error);
                storeResult(currentEntry.buildName, "existing production unknown, aborting build!", "production", "web", true, false, false);
                fs.unlinkSync(productionConfigFile);
                currentlyBuilding.delete(currentEntry.buildName);
            });
        } catch (exception) {
            console.log(exception);
            console.log("frinex-gui production failed");
            storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
            fs.unlinkSync(productionConfigFile);
            currentlyBuilding.delete(currentEntry.buildName);
        }
    }
}

function deployProductionAdmin(currentEntry, buildArtifactsJson, buildArtifactsFileName) {
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
        var dockerString = 'docker stop ' + buildContainerName
            + " &> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + 'docker run'
            + ' --rm '
            + ' --name ' + buildContainerName
            /* not currently required */ //+ ' --net="host" ' // enables the container to connect to ports on the host, so that maven can access tomcat manager
            // # the maven settings and its .m2 directory need to be in the volume m2Directory:/maven/.m2/
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v webappsTomcatProduction:/usr/local/tomcat/webapps'
            + ' -v buildServerTarget:/usr/local/apache2/htdocs'
            + ' -v m2Directory:/maven/.m2/'
            + ' -w /ExperimentTemplate frinexapps /bin/bash -c "cd /ExperimentTemplate/registration;'
            + ' ls -l /usr/local/apache2/htdocs/' + currentEntry.buildName + ' &>> /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt;'
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            //+ ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            + 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl frinex-admin'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dexperiment.configuration.displayName=\\\"' + currentEntry.experimentDisplayName + '\\\"'
            + ' -Dexperiment.webservice=' + configServer
            + ' -Dexperiment.configuration.path=/FrinexBuildService/processing/production-building'
            + ' -Dexperiment.artifactsJsonDirectory=/usr/local/apache2/htdocs/' + currentEntry.buildName + '/'
            + ' -DversionCheck.allowSnapshots=' + 'false'
            + ' -DversionCheck.buildType=' + 'stable'
            + ' -Dexperiment.destinationServer=' + productionServer
            + ' -Dexperiment.destinationServerUrl=' + productionServerUrl
            + ' -Dexperiment.groupsSocketUrl=' + productionGroupsSocketUrl
            + ' -Dexperiment.isScaleable=' + currentEntry.isScaleable
            + ' -Dexperiment.defaultScale=' + currentEntry.defaultScale
            + ' -Dexperiment.registrationUrl=' + currentEntry.registrationUrlProduction
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_production_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-admin-*-stable-sources.jar /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin_sources.jar'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt;"
            + '"';
        console.log(dockerString);
        try {
            execSync(dockerString, { stdio: [0, 1, 2] });
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.war")) {
                console.log("frinex-gui finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "production", "admin", false, false, true);
                if (currentEntry.state === "production") {
                    deployProductionGui(currentEntry);
                }
                buildArtifactsJson.artifacts['admin'] = currentEntry.buildName + "_production_admin.war";
                // update artifacts.json
                fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
                currentlyBuilding.delete(currentEntry.buildName);
                fs.unlinkSync(productionConfigFile);
            } else {
                console.log("deployProductionAdmin failed");
                console.log(currentEntry.experimentDisplayName);
                currentlyBuilding.delete(currentEntry.buildName);
                fs.unlinkSync(productionConfigFile);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
            };
            currentlyBuilding.delete(currentEntry.buildName);
        } catch (error) {
            console.error('deployProductionAdmin error: ' + error);
            currentlyBuilding.delete(currentEntry.buildName);
            fs.unlinkSync(productionConfigFile);
            storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
        }
        console.log("deployProductionAdmin ended");
    }
}

function buildApk(buildName, stage, buildArtifactsJson, buildArtifactsFileName) {
    console.log("starting cordova build");
    storeResult(buildName, "building", stage, "android", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_android.txt")) {
            fs.unlinkSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_android.txt");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_android.txt", 'w'));
        resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_android.txt" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "android", false, true, false);
        // we do not build in the docker volume because it would create redundant file synchronisation.
        var dockerString = 'docker stop ' + buildName + '_staging_cordova;'
            + 'docker run --name ' + buildName + '_staging_cordova --rm'
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:/usr/local/apache2/htdocs'
            + ' frinexapps /bin/bash -c "'
            + ' mkdir /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/processing/staging-building/' + buildName + '_setup-cordova.sh /FrinexBuildService/processing/staging-building/' + buildName + '-frinex-gui-*-stable-cordova.zip /FrinexBuildService/cordova-' + stage + '-build &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' bash /FrinexBuildService/cordova-' + stage + '-build/' + buildName + '_setup-cordova.sh &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' ls /FrinexBuildService/cordova-' + stage + '-build/* &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/app-release.apk ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_cordova.apk &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + buildName + '-frinex-gui-*-stable-cordova.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_cordova.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + buildName + '-frinex-gui-*-stable-android.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' cp /FrinexBuildService/cordova-' + stage + '-build/' + buildName + '-frinex-gui-*-stable-ios.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_ios.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_android.txt;'
            + ' chmod a+rwx ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_cordova.*;'
            + '"';
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
    } catch (ex) {
        resultString += 'failed&nbsp;';
        hasFailed = true;
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(targetDirectory + "/" + buildName);
    var producedOutput = false;
    list.forEach(function (filename) {
        if (filename.endsWith(".apk")) {
            fs.createReadStream(targetDirectory + "/" + buildName + "/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_cordova.apk"));
            resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_cordova.apk" + '">apk</a>&nbsp;';
            buildArtifactsJson.artifacts.apk = filename;
            producedOutput = true;
        }
        if (filename.endsWith("cordova.zip")) {
            fs.createReadStream(targetDirectory + "/" + buildName + "/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_cordova.zip"));
            resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_cordova.zip" + '">src</a>&nbsp;';
        }
        if (filename.endsWith("android.zip")) {
            fs.createReadStream(targetDirectory + "/" + buildName + "/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_android.zip"));
            resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_android.zip" + '">android-src</a>&nbsp;';
            buildArtifactsJson.artifacts.apk_src = filename;
            producedOutput = true;
        }
        if (filename.endsWith("ios.zip")) {
            fs.createReadStream(targetDirectory + "/" + buildName + "/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_ios.zip"));
            resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_ios.zip" + '">ios-src</a>&nbsp;';
            buildArtifactsJson.artifacts.ios_src = filename;
            producedOutput = true;
        }
    });
    console.log("build cordova finished");
    storeResult(buildName, resultString, stage, "android", hasFailed || !producedOutput, false, true);
    //update artifacts.json
    //const buildArtifactsFileName = processingDirectory + '/' + stage + '-building/' + buildName + "_" + stage + '_artifacts.json';
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
}

function buildElectron(buildName, stage, buildArtifactsJson, buildArtifactsFileName) {
    console.log("starting electron build");
    storeResult(buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_electron.txt")) {
            fs.unlinkSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_electron.txt");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_electron.txt", 'w'));
        resultString += '<a href="' + buildName + '/' + buildName + "_" + stage + "_electron.txt" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "desktop", false, true, false);
        var dockerString = 'docker stop ' + buildName + '_' + stage + '_electron;'
            + 'docker run --name ' + buildName + '_' + stage + '_electron --rm'
            + ' -v processingDirectory:/FrinexBuildService/processing'
            + ' -v buildServerTarget:/usr/local/apache2/htdocs'
            + ' frinexapps /bin/bash -c "'
            + ' mkdir /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/processing/' + stage + '-building/' + buildName + '_setup-electron.sh /FrinexBuildService/processing/' + stage + '-building/' + buildName + '-frinex-gui-*-stable-electron.zip /FrinexBuildService/electron-' + stage + '-build &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' bash /FrinexBuildService/electron-' + stage + '-build/' + buildName + '_setup-electron.sh &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' ls /FrinexBuildService/electron-' + stage + '-build/* &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + buildName + '-frinex-gui-*-electron.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + buildName + '-win32-ia32.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_win32-ia32.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + buildName + '-win32-x64.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_win32-x64.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' cp /FrinexBuildService/electron-' + stage + '-build/' + buildName + '-darwin-x64.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_darwin-x64.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            //+ ' cp /FrinexBuildService/electron-' + stage + '-build/' + buildName + '-frinex-gui-*-linux-x64.zip ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_linux-x64.zip &>> ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.txt;'
            + ' chmod a+rwx ' + targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_*.zip;'
            + '"';
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
        //resultString += "built&nbsp;";
    } catch (ex) {
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    var producedOutput = false;
    // update the links and artifacts JSON
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_electron.zip')) {
        resultString += '<a href="' + buildName + '/' + buildName + '_' + stage + '_electron.zip">src</a>&nbsp;';
        buildArtifactsJson.artifacts['src'] = buildName + '_' + stage + '_electron.zip';
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_win32-ia32.zip')) {
        resultString += '<a href="' + buildName + '/' + buildName + '_' + stage + '_win32-ia32.zip">win32</a>&nbsp;';
        buildArtifactsJson.artifacts['win32'] = buildName + '_' + stage + '_win32-ia32.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_win32-x64.zip')) {
        resultString += '<a href="' + buildName + '/' + buildName + '_' + stage + '_win32-x64.zip">win64</a>&nbsp;';
        buildArtifactsJson.artifacts['win64'] = buildName + '_' + stage + '_win32-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_darwin-x64.zip')) {
        resultString += '<a href="' + buildName + '/' + buildName + '_' + stage + '_darwin-x64.zip">mac</a>&nbsp;';
        buildArtifactsJson.artifacts['mac'] = buildName + '_' + stage + '_darwin-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '_linux-x64.zip')) {
        resultString += '<a href="' + buildName + '_' + stage + '_linux-x64.zip">linux</a>&nbsp;';
        buildArtifactsJson.artifacts['linux'] = buildName + '_' + stage + '_linux-x64.zip';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '.asar')) {
        resultString += '<a href="' + buildName + '_' + stage + '.asar">asar</a>&nbsp;';
        buildArtifactsJson.artifacts['asar'] = buildName + '_' + stage + '.asar';
        producedOutput = true;
    }
    if (fs.existsSync(targetDirectory + '/' + buildName + '/' + buildName + '_' + stage + '.dmg')) {
        resultString += '<a href="' + buildName + '_' + stage + '.dmg">dmg</a>&nbsp;';
        buildArtifactsJson.artifacts['dmg'] = buildName + '_' + stage + '.dmg';
        producedOutput = true;
    }
    //mkdir /srv/target/electron
    //cp out/make/*linux*.zip ../with_stimulus_example-linux.zip
    //cp out/make/*win32*.zip ../with_stimulus_example-win32.zip
    //cp out/make/*darwin*.zip ../with_stimulus_example-darwin.zip
    console.log("build electron finished");
    storeResult(buildName, resultString, stage, "desktop", hasFailed || !producedOutput, false, true);
    //  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
}

function buildNextExperiment() {
    while (listingMap.size > 0 && currentlyBuilding.size <= concurrentBuildCount) {
        const currentKey = listingMap.keys().next().value;
        console.log('buildNextExperiment: ' + currentKey);
        resultsFile.write("buildNextExperiment: " + currentKey + "</div>");
        const currentEntry = listingMap.get(currentKey);
        currentlyBuilding.set(currentEntry.buildName, currentEntry);
        listingMap.delete(currentKey);
        //console.log("starting generate stimulus");
        //execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
        if (currentEntry.state === "staging" || currentEntry.state === "production") {
            deployStagingGui(currentEntry);
        } else if (currentEntry.state === "undeploy") {
            unDeploy(listing, currentEntry);
        } else {
            console.log("nothing to do for: " + queuedConfigFile);
            currentlyBuilding.delete(currentEntry.buildName);
            fs.unlinkSync(path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml'));
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
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.svg">uml-svg</a>&nbsp;';
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
                        resultsFile.write("<div>waitingTermination: " + buildName + "</div>");
                        storeResult(fileNamePart, 'restarting build', "staging", "web", true, false, false);
                    } else {
                        var listingFile = path.resolve(listingDirectory, buildName + '.json');
                        if (!fs.existsSync(listingFile)) {
                            console.log('listingFile not found: ' + listingFile);
                            resultsFile.write("<div>listingFile not found: " + listingFile + "</div>");
                            // in this case delete the XML as well
                            fs.unlinkSync(path.resolve(processingDirectory + '/queued', filename));
                        } else {
                            var queuedConfigFile = path.resolve(processingDirectory + '/queued', filename);
                            var stagingQueuedConfigFile = path.resolve(processingDirectory + '/staging-queued', filename);
                            // this move is within the same volume so we can do it this easy way
                            fs.renameSync(queuedConfigFile, stagingQueuedConfigFile);

                            // keeping the listing entry in a map so only one can exist for any experiment regardless of mid compilation rebuild requests
                            console.log('jsonListing: ' + buildName);
                            resultsFile.write("<div>jsonListing: " + buildName + "</div>");
                            var listingJsonData = JSON.parse(fs.readFileSync(listingFile, 'utf8'));
                            listingJsonData.buildName = buildName;
                            console.log('listingJsonData: ' + JSON.stringify(listingJsonData));
                            fs.unlinkSync(listingFile);
                            listingMap.set(buildName, listingJsonData);
                            storeResult(fileNamePart, '', "staging", "web", false, false, false);
                            storeResult(fileNamePart, '', "staging", "admin", false, false, false);
                            storeResult(fileNamePart, '', "staging", "android", false, false, false);
                            storeResult(fileNamePart, '', "staging", "desktop", false, false, false);
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
                            }
                            /*} else {
                                // todo: check all repositories for duplicate experiments by name and abort if any are found for this experiment name.
                                initialiseResult(fileNamePart, '<div class="shortmessage">conflict in listing.json<span class="longmessage">Two or more listings for this experiment exist in ' + listingJsonFiles + ' as a precaution this script will not continue until this error is resovled.</span></div>', true);
                                // todo: put this text and related information into an error text file with link
                                console.log("this script will not build when two or more listings are found in " + listingJsonFiles);
                            }*/
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
    var incomingReadStream = fs.createReadStream(incomingFile);
    incomingReadStream.on('close', function () {
        if (fs.existsSync(incomingFile)) {
            fs.unlinkSync(incomingFile);
            console.log('removed: ' + incomingFile);
            //resultsFile.write("<div>removed: " + incomingFile + "</div>");
        }
    });
    incomingReadStream.pipe(fs.createWriteStream(targetFile));
}

function prepareForProcessing() {
    var list = fs.readdirSync(processingDirectory + '/validated');
    for (var filename of list) {
        console.log('processing: ' + filename);
        var fileNamePart = path.parse(filename).name;
        resultsFile.write("<div>processing validated: " + filename + "</div>");
        var incomingFile = path.resolve(processingDirectory + '/validated', filename);
        //fs.chmodSync(incomingFile, 0o777); // chmod needs to be done by Docker when the files are created.
        if (filename === "listing.json") {
            console.log('Deprecated listing.json found. Please specify build options in the relevant section of the experiment XML.');
            resultsFile.write("<div>Deprecated listing.json found. Please specify build options in the relevant section of the experiment XML.</div>");
        } else if (path.extname(filename) === ".json") {
            var jsonStoreFile = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //console.log('incomingFile: ' + incomingFile);
            //console.log('jsonStoreFile: ' + jsonStoreFile);
            //fs.renameSync(incomingFile, jsonStoreFile);
            console.log('copying JSON from validated to target: ' + filename);
            resultsFile.write("<div>copying JSON from validated to target: " + filename + "</div>");
            copyDeleteFile(incomingFile, jsonStoreFile);
        } else if (path.extname(filename) === ".xml") {
            //var processingName = path.resolve(processingDirectory, filename);
            // preserve the current XML by copying it to /srv/target which will be accessed via a link in the first column of the results table
            var configStoreFile = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            var configQueuedFile = path.resolve(processingDirectory + "/queued", filename);
            console.log('configStoreFile: ' + configStoreFile);
            // this move is within the same volume so we can do it this easy way
            fs.copyFileSync(incomingFile, configQueuedFile);
            console.log('copied XML from validated to queued: ' + filename);
            resultsFile.write("<div>copied XML from validated to queued: " + filename + "</div>");
            console.log('copying XML from queued to target: ' + filename);
            resultsFile.write("<div>copying XML from queued to target: " + filename + "</div>");
            // this move is not within the same volume
            copyDeleteFile(incomingFile, configStoreFile);
        } else if (path.extname(filename) === ".uml") {
            // preserve the generated UML to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            //console.log('copying UML from validated to target: ' + incomingFile);
            //resultsFile.write("<div>copying UML from validated to target: " + incomingFile + "</div>");
            copyDeleteFile(incomingFile, targetName);
        } else if (path.extname(filename) === ".svg") {
            // preserve the generated UML SVG to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            //console.log('copying SVG from validated to target: ' + filename);
            //resultsFile.write("<div>copying SVG from validated to target: " + filename + "</div>");
            copyDeleteFile(incomingFile, targetName);
        } else if (path.extname(filename) === ".xsd") {
            // place the generated XSD file for use in XML editors
            var targetName = path.resolve(targetDirectory, filename);
            //console.log('copying XSD from validated to target: ' + filename);
            //resultsFile.write("<div>copying XSD from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            copyDeleteFile(incomingFile, targetName);
        } else if (filename.endsWith("frinex.html")) {
            // place the generated documentation file for use in web browsers
            var targetName = path.resolve(targetDirectory, filename);
            //console.log('copying HTML from validated to target: ' + filename);
            //resultsFile.write("<div>copying HTML from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            copyDeleteFile(incomingFile, targetName);
        } else if (filename.endsWith("_validation_error.txt")) {
            var configErrorFile = path.resolve(targetDirectory + "/" + fileNamePart.substring(0, fileNamePart.length - "_validation_error".length), filename);
            console.log('copying from validated to target: ' + filename);
            resultsFile.write("<div>copying from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, processingName);
            copyDeleteFile(incomingFile, configErrorFile);
        } else if (fs.existsSync(incomingFile)) {
            console.log('deleting unkown file: ' + incomingFile);
            resultsFile.write("<div>deleting unkown file: " + incomingFile + "</div>");
            fs.unlinkSync(incomingFile);
        }
    }
    buildFromListing();
}

function moveIncomingToQueued() {
    if (!fs.existsSync(incomingDirectory + "/queued")) {
        fs.mkdirSync(incomingDirectory + '/queued');
        console.log('queued directory created');
        resultsFile.write("<div>queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/validated")) {
        fs.mkdirSync(processingDirectory + '/validated');
        console.log('validated directory created');
        resultsFile.write("<div>validated directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/queued")) {
        fs.mkdirSync(processingDirectory + '/queued');
        console.log('staging directory created');
        resultsFile.write("<div>queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/staging-queued")) {
        fs.mkdirSync(processingDirectory + '/staging-queued');
        console.log('staging directory created');
        resultsFile.write("<div>staging queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/staging-building")) {
        fs.mkdirSync(processingDirectory + '/staging-building');
        console.log('staging directory created');
        resultsFile.write("<div>staging building directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/production-queued")) {
        fs.mkdirSync(processingDirectory + '/production-queued');
        console.log('production directory created');
        resultsFile.write("<div>production queued directory created</div>");
    }
    if (!fs.existsSync(processingDirectory + "/production-building")) {
        fs.mkdirSync(processingDirectory + '/production-building');
        console.log('production directory created');
        resultsFile.write("<div>production building directory created</div>");
    }
    fs.readdir(incomingDirectory + '/commits', function (error, list) {
        if (error) {
            console.error(error);
        } else {
            var remainingFiles = list.length;
            if (remainingFiles <= 0) {
                // check for files in process before exiting from this script 
                var hasProcessingFiles = false;
                var processingList = fs.readdirSync(processingDirectory);
                for (var currentDirectory of processingList) {
                    var currentDirectoryPath = path.resolve(processingDirectory, currentDirectory);
                    var processingList = fs.readdirSync(currentDirectoryPath);
                    if (processingList.length > 0) {
                        hasProcessingFiles = true;
                    }
                }
                if (hasProcessingFiles === true) {
                    console.log('moveIncomingToQueued: hasProcessingFiles');
                    //resultsFile.write("<div>has more files in processing</div>");
                    prepareForProcessing();
                    setTimeout(moveIncomingToQueued, 3000);
                } else {
                    // we allow the process to exit here if there are no files
                    console.log('moveIncomingToQueued: no files');
                    resultsFile.write("<div>no more files in processing</div>");
                    stopUpdatingResults();
                }
            } else {
                list.forEach(function (filename) {
                    var incomingFile = path.resolve(incomingDirectory + '/commits/', filename);
                    var queuedFile = path.resolve(incomingDirectory + '/queued/', filename);
                    if ((path.extname(filename) === ".json" || path.extname(filename) === ".xml") && filename !== "listing.json") {
                        resultsFile.write("<div>initialise: '" + filename + "'</div>");
                        console.log('initialise: ' + filename);
                        var currentName = path.parse(filename).name;
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
                                execSync('docker stop ' + currentName + '_staging_web ' + currentName + '_staging_admin ' + currentName + '_staging_cordova ' + currentName + '_staging_electron', { stdio: [0, 1, 2] });
                            } catch (reason) {
                                console.log(reason);
                            }
                        }
                        var productionBuildingConfigFile = path.resolve(processingDirectory + '/production-building', currentName + '.xml');
                        if (fs.existsSync(productionBuildingConfigFile)) {
                            console.log("moveIncomingToQueued found: " + productionBuildingConfigFile);
                            console.log("moveIncomingToQueued if another process already building it will be terminated: " + currentName);
                            fs.unlinkSync(productionBuildingConfigFile);
                            try {
                                execSync('docker stop ' + currentName + '_production_web ' + currentName + '_production_admin ' + currentName + '_production_cordova ' + currentName + '_production_electron', { stdio: [0, 1, 2] });
                            } catch (reason) {
                                console.log(reason);
                            }
                        }
                        initialiseResult(currentName, 'queued', false);
                        //if (fs.existsSync(targetDirectory + "/" + currentName)) {
                        // todo: consider if this agressive removal is always wanted
                        //    fs.rmdirSync(targetDirectory + "/" + currentName, { recursive: true });
                        //}
                        if (!fs.existsSync(targetDirectory + "/" + currentName)) {
                            fs.mkdirSync(targetDirectory + '/' + currentName);
                        }
                        // this move is within the same volume so we can do it this easy way
                        fs.renameSync(incomingFile, queuedFile);
                    } else {
                        resultsFile.write("<div>removing unusable type: '" + filename + "'</div>");
                        //console.log('removing unusable type: ' + filename);
                        if (fs.existsSync(incomingFile)) {
                            fs.unlinkSync(incomingFile);
                            console.log('deleted unusable file: ' + incomingFile);
                        }
                    }
                    remainingFiles--;
                    if (remainingFiles <= 0) {
                        convertJsonToXml();
                        setTimeout(moveIncomingToQueued, 3000);
                    }
                });
            }
        }
    });
}

function convertJsonToXml() {
    //resultsFile.write("<div>Converting JSON to XML, '" + new Date().toISOString() + "'</div>");
    var dockerString = 'docker stop json_to_xml'
        + ' &> /usr/local/apache2/htdocs/json_to_xml.txt;'
        + 'docker run --rm'
        //+ ' --user "$(id -u):$(id -g)"'
        + ' --name json_to_xml'
        + ' -v incomingDirectory:/FrinexBuildService/incoming'
        + ' -v processingDirectory:/FrinexBuildService/processing'
        + ' -v listingDirectory:/FrinexBuildService/listing'
        + ' -v buildServerTarget:/usr/local/apache2/htdocs'
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        + ' frinexapps:latest /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml /FrinexBuildService/incoming/queued /FrinexBuildService/processing/validated /FrinexBuildService/listing\\"'
        + ' &>> /usr/local/apache2/htdocs/json_to_xml.txt;'
        + ' chmod a+rwx /FrinexBuildService/processing/validated/* /FrinexBuildService/listing/*'
        + ' &>> /usr/local/apache2/htdocs/json_to_xml.txt;"';
    //+ " &> " + targetDirectory + "/JsonToXml_" + new Date().toISOString() + ".txt";
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("convert JSON to XML finished");
        //resultsFile.write("<div>Conversion from JSON to XML finished, '" + new Date().toISOString() + "'</div>");
        prepareForProcessing();
    } catch (reason) {
        console.log(reason);
        console.log("convert JSON to XML failed");
        resultsFile.write("<div>Conversion from JSON to XML failed, '" + new Date().toISOString() + "'</div>");
    };
}

function deleteOldProcessing() {
    // since this is only called on a restart we delete the sub directories of the processing directory
    var processingList = fs.readdirSync(processingDirectory);
    for (var currentDirectory of processingList) {
        var currentDirectoryPath = path.resolve(processingDirectory, currentDirectory);
        fs.rmdirSync(currentDirectoryPath, { recursive: true });
        console.log('deleted processing: ' + currentDirectory);
    }
    moveIncomingToQueued();
}

startResult();
deleteOldProcessing();
