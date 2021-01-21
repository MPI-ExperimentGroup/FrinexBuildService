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

var resultsFile = fs.createWriteStream(targetDirectory + "/index.html", { flags: 'w', mode: 0o755 });

var buildHistoryFileName = targetDirectory + "/buildhistory.json";
var buildHistoryJson = { table: {} };
var buildArtifactsJson = { artifacts: {} };
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
}

function deployStagingGui(currentEntry) {
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
            + ' -Dxperiment.configuration.displayName=' + currentEntry.experimentDisplayName
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
            + ' mv /ExperimentTemplate/gwt-cordova/target/*.jar /FrinexBuildService/processing/staging-building/'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            + ' cp /ExperimentTemplate/gwt-cordova/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
            //+ ' mv /ExperimentTemplate/gwt-cordova/target/*.war /FrinexBuildService/processing/staging-building/'
            //+ " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging.txt;"
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
                deployStagingAdmin(currentEntry);
            } else {
                //console.log(targetDirectory);
                //console.log(JSON.stringify(reason, null, 4));
                console.log("deployStagingGui failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging.txt">failed</a>', "staging", "web", true, false, false);
                //var errorFile = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "_staging.html", {flags: 'w'});
                //errorFile.write(currentEntry.experimentDisplayName + ": " + JSON.stringify(reason, null, 4));
            };
        });
    }
}

function deployStagingAdmin(currentEntry) {
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
            + ' mvn clean compile ' // the target compile is used to cause compilation errors to show up before all the effort of 
            //+ ((currentEntry.isWebApp) ? 'tomcat7:undeploy tomcat7:redeploy' : 'package')
            + 'package'
            + ' -gs /maven/.m2/settings.xml'
            + ' -DskipTests'
            //+ ' -pl frinex-admin'
            + ' -Dexperiment.configuration.name=' + currentEntry.buildName
            + ' -Dxperiment.configuration.displayName=' + currentEntry.experimentDisplayName
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
            + ' rm -r /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/tomcat/webapps/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + ' cp /ExperimentTemplate/registration/target/' + currentEntry.buildName + '-frinex-gui-*.war /usr/local/apache2/htdocs/' + currentEntry.buildName + '_staging_admin.war'
            + " &>> /usr/local/apache2/htdocs/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.txt;"
            + '"';
        console.log(dockerString);
        exec(dockerString, (error, stdout, stderr) => {
            if (error) {
                console.error(`deployStagingAdmin error: ${error}`);
            }
            console.log(`deployStagingAdmin stdout: ${stdout}`);
            console.error(`deployStagingAdmin stderr: ${stderr}`);
            if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_staging_admin.war")) {
                console.log("frinex-gui finished");
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.war">download</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexstaging.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "staging", "admin", false, false, true);
                if (currentEntry.state === "production") {
                    deployProductionGui(currentEntry);
                }
            } else {
                console.log("deployStagingAdmin failed");
                console.log(currentEntry.experimentDisplayName);
                storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_staging_admin.txt">failed</a>', "staging", "admin", true, false, false);
            };
        });
    }
}

function deployProductionGui(currentEntry) {
    console.log(productionServerUrl + '/' + currentEntry.buildName);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">building</a>', "production", "web", false, true, false);
    try {
        https.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
            if (response.statusCode !== 404) {
                console.log("existing frinex-gui production found, aborting build!");
                console.log(response.statusCode);
                storeResult(currentEntry.buildName, "existing production found, aborting build!", "production", "web", true, false, false);
            } else {
                console.log(response.statusCode);
                var mvngui = require('maven').create({
                    cwd: __dirname + "/gwt-cordova",
                    settings: m2Settings
                });
                if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt")) {
                    fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt");
                }
                fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt", 'w'));
                var mavenLogPG = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production.txt", { mode: 0o755 });
                process.stdout.write = process.stderr.write = mavenLogPG.write.bind(mavenLogPG);
                mvngui.execute(['clean', (currentEntry.isWebApp) ? 'tomcat7:deploy' : 'package'], {
                    'skipTests': true, '-pl': 'frinex-gui',
                    //'altDeploymentRepository.snapshot-repo.default.file': '~/Desktop/FrinexAPKs/',
                    //'altDeploymentRepository': 'default:file:file://~/Desktop/FrinexAPKs/',
                    //'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
                    //'maven.repo.local': '~/Desktop/FrinexAPKs/',
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
                    //'experiment.scriptSrcUrl': productionServerUrl,
                    //'experiment.staticFilesUrl': productionServerUrl
                }).then(function (value) {
                    console.log("frinex-gui production finished");
                    //storeResult(currentEntry.buildName, "skipped", "production", "web", false, false, true);
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '">browse</a>', "production", "web", false, false, true);
                    if (currentEntry.isAndroid || currentEntry.isiOS) {
                        buildApk(currentEntry.buildName, "production");
                    }
                    if (currentEntry.isDesktop) {
                        buildElectron(currentEntry.buildName, "production");
                    }
                    deployProductionAdmin(currentEntry);
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-gui production failed");
                    console.log(currentEntry.experimentDisplayName);
                    //storeResult(currentEntry.buildName, "failed", "production", "web", true, false);
                    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production.txt">failed (existing production unknown)</a>', "production", "web", true, false, false);
                });
            }
        });
    } catch (exception) {
        console.log(exception);
        console.log("frinex-gui production failed");
        storeResult(currentEntry.buildName, 'failed', "production", "web", true, false, false);
    }
}

function deployProductionAdmin(currentEntry) {
    var mvnadmin = require('maven').create({
        cwd: __dirname + "/registration",
        settings: m2Settings
    });
    if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt")) {
        fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt");
    }
    fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt", 'w'));
    var mavenLogPA = fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + currentEntry.buildName + "_production_admin.txt", { mode: 0o755 });
    process.stdout.write = process.stderr.write = mavenLogPA.write.bind(mavenLogPA);
    storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">building</a>', "production", "admin", false, true, false);
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
        //console.log(value);
        //fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
        console.log("frinex-admin production finished");
        //storeResult(currentEntry.buildName, "skipped", "production", "admin", false, false, true);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">log</a>&nbsp;<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.war">download</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin">browse</a>&nbsp;<a href="https://frinexproduction.mpi.nl/' + currentEntry.buildName + '-admin/monitoring">monitor</a>', "production", "admin", false, false, true);
    }, function (reason) {
        console.log(reason);
        console.log("frinex-admin production failed");
        console.log(currentEntry.experimentDisplayName);
        //storeResult(currentEntry.buildName, "failed", "production", "admin", true, false);
        storeResult(currentEntry.buildName, '<a href="' + currentEntry.buildName + '/' + currentEntry.buildName + '_production_admin.txt">failed</a>', "production", "admin", true, false, false);
    });
}

function buildApk(buildName, stage) {
    console.log("starting cordova build");
    storeResult(buildName, "building", stage, "android", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_android.log")) {
            fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_android.log");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_android.log", 'w'));
        resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_android.log" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "android", false, true, false);
        var dockerString = 'docker run -v ' + __dirname + '/gwt-cordova/target:/target -v ' + __dirname + '/FieldKitRecorder:/FieldKitRecorder frinexapps bash /target/setup-cordova.sh &> ' + targetDirectory + "/" + buildName + "/" + buildName + "_" + stage + "_android.log";
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
    } catch (ex) {
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        if (filename.endsWith(".apk")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_cordova.apk"));
            resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_cordova.apk" + '">apk</a>&nbsp;';
            buildArtifactsJson.artifacts.apk = filename;
        }
        if (filename.endsWith("cordova.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_cordova.zip"));
            resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_cordova.zip" + '">src</a>&nbsp;';
        }
        if (filename.endsWith("android.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_android.zip"));
            resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_android.zip" + '">android-src</a>&nbsp;';
            buildArtifactsJson.artifacts.apk_src = filename;
        }
        if (filename.endsWith("ios.zip")) {
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_ios.zip"));
            resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_ios.zip" + '">ios-src</a>&nbsp;';
            buildArtifactsJson.artifacts.ios_src = filename;
        }
    });
    console.log("build cordova finished");
    storeResult(buildName, resultString, stage, "android", hasFailed, false, true);
    //update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
}

function buildElectron(buildName, stage) {
    console.log("starting electron build");
    storeResult(buildName, "building", stage, "desktop", false, true, false);
    var resultString = "";
    var hasFailed = false;
    try {
        if (fs.existsSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_electron.log")) {
            fs.unlinkSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_electron.log");
        }
        fs.closeSync(fs.openSync(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_electron.log", 'w'));
        resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_electron.log" + '">log</a>&nbsp;';
        storeResult(buildName, "building " + resultString, stage, "desktop", false, true, false);
        var dockerString = 'docker run -v ' + __dirname + '/gwt-cordova/target:/target frinexapps bash /target/setup-electron.sh &> ' + targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_electron.log";
        console.log(dockerString);
        execSync(dockerString, { stdio: [0, 1, 2] });
        //resultString += "built&nbsp;";
    } catch (ex) {
        resultString += "failed&nbsp;";
        hasFailed = true;
    }
    // copy the resulting zips and add links to the output JSON
    var list = fs.readdirSync(__dirname + "/gwt-cordova/target");
    list.forEach(function (filename) {
        console.log(filename);
        //if (filename.endsWith("electron.log")) {
        //    fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + buildName + "_" + stage + "_electron.log"));
        //    resultString += '<a href="' + currentEntry.buildName + '/' + buildName + "_" + stage + "_electron.log" + '">log</a>';
        //}
        if (filename.endsWith(".zip")) {
            var fileTypeString = "zip";
            if (filename.indexOf("electron.zip") > -1) {
                fileTypeString = "src";
            } else if (filename.indexOf("win32-ia32.zip") > -1) {
                fileTypeString = "win32";
            } else if (filename.indexOf("win32-x64.zip") > -1) {
                fileTypeString = "win";
            } else if (filename.indexOf("darwin-x64.zip") > -1) {
                fileTypeString = "mac";
            } else if (filename.indexOf("linux-x64.zip") > -1) {
                fileTypeString = "linux";
            }
            if (fileTypeString !== "zip") {
                var finalName = buildName + "_" + stage + "_" + fileTypeString + ".zip";
                fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + finalName));
                if (filename !== finalName) {
                    fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(__dirname + "/gwt-cordova/target/" + finalName));
                }
                resultString += '<a href="' + currentEntry.buildName + '/' + finalName + '">' + fileTypeString + '</a>&nbsp;';
                buildArtifactsJson.artifacts[fileTypeString] = finalName;
            }
        }
        if (filename.endsWith(".asar")) {
            var fileTypeString = "asar";
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + filename));
            resultString += '<a href="' + currentEntry.buildName + '/' + filename + '">' + fileTypeString + '</a>&nbsp;';
            buildArtifactsJson.artifacts[fileTypeString] = filename;
        }
        if (filename.endsWith(".dmg")) {
            var fileTypeString = "dmg";
            var finalName = buildName + "_" + stage + ".dmg";
            fs.createReadStream(__dirname + "/gwt-cordova/target/" + filename).pipe(fs.createWriteStream(targetDirectory + "/" + currentEntry.buildName + "/" + finalName));
            resultString += '<a href="' + currentEntry.buildName + '/' + finalName + '">' + fileTypeString + '</a>&nbsp;';
            buildArtifactsJson.artifacts[fileTypeString] = finalName;
        }
        //mkdir /srv/target/electron
        //cp out/make/*linux*.zip ../with_stimulus_example-linux.zip
        //cp out/make/*win32*.zip ../with_stimulus_example-win32.zip
        //cp out/make/*darwin*.zip ../with_stimulus_example-darwin.zip
    });    //- todo: copy the resutting zips and add links to the output JSON
    console.log("build electron finished");
    storeResult(buildName, resultString, stage, "desktop", hasFailed, false, true);
    //  update artifacts.json
    fs.writeFileSync(buildArtifactsFileName, JSON.stringify(buildArtifactsJson, null, 4), { mode: 0o755 });
}

function buildNextExperiment(listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        //console.log(currentEntry);
        //console.log("starting generate stimulus");
        //execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
        if (currentEntry.state === "staging" || currentEntry.state === "production") {
            var queuedConfigFile = path.resolve(processingDirectory + '/queued', currentEntry.buildName + '.xml');
            var stagingQueuedConfigFile = path.resolve(processingDirectory + '/staging-queued', currentEntry.buildName + '.xml');
            // this move is within the same volume so we can do it this easy way
            fs.renameSync(queuedConfigFile, stagingQueuedConfigFile);
            deployStagingGui(listing, currentEntry);
        } else if (currentEntry.state === "undeploy") {
            unDeploy(listing, currentEntry);
        } else {
            buildNextExperiment(listing);
        }
    } else {
        console.log("build process from listing completed");
    }
}

function buildFromListing() {
    var listingJsonArray = [];
    fs.readdirSync(listingDirectory, function (error, list) {
        if (error) {
            console.error(error);
        } else {
            for (var filename of list) {
                listingFile = path.resolve(listingDirectory, filename);
                var listingJsonData = JSON.parse(fs.readFileSync(listingFile, 'utf8'));
                listingJsonArray.push(listingJsonData);
            }
        }
    });
    var list = fs.readdirSync(processingDirectory + '/queued');
    var listing = [];
    if (list.length <= 0) {
        console.log('buildFromListing found no files');
    } else {
        for (var filename of list) {
            console.log('buildFromListing: ' + filename);
            //console.log(path.extname(filename));
            var fileNamePart = path.parse(filename).name;
            if (fileNamePart === "multiparticipant") {
                storeResult(fileNamePart, 'disabled', "validation", "json_xsd", true, false, false);
                console.log("this script will not build multiparticipant without manual intervention");
            } else {
                var validationMessage = "";
                var filenamePath = path.resolve(processingDirectory + '/queued', filename);
                console.log(filename);
                console.log(filenamePath);
                var buildName = fileNamePart;
                console.log(buildName);
                var withoutSuffixPath = path.resolve(targetDirectory + '/' + fileNamePart, fileNamePart);
                console.log('withoutSuffixPath: ' + withoutSuffixPath);
                if (fs.existsSync(withoutSuffixPath + ".json")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.json">json</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (fs.existsSync(withoutSuffixPath + ".svg")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.svg">svg</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
                }
                if (fs.existsSync(withoutSuffixPath + ".uml")) {
                    validationMessage += '<a href="' + fileNamePart + '/' + fileNamePart + '.uml">uml</a>&nbsp;';
                    storeResult(fileNamePart, validationMessage, "validation", "json_xsd", false, false, false);
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
            }
        }
        console.log(JSON.stringify(listing));
        buildNextExperiment(listing);
    }
}

function prepareForProcessing() {
    var list = fs.readdirSync(processingDirectory + '/validated');
    for (var filename of list) {
        console.log('processing: ' + filename);
        var fileNamePart = path.parse(filename).name;
        resultsFile.write("<div>processing validated: " + filename + "</div>");
        var incomingFile = path.resolve(processingDirectory + '/validated', filename);
        var incomingReadStream = fs.createReadStream(incomingFile);
        incomingReadStream.on('close', function (completedFile, completedFilename) {
            if (fs.existsSync(completedFile)) {
                fs.unlinkSync(completedFile);
                console.log('removed: ' + completedFilename);
                resultsFile.write("<div>removed: " + completedFilename + "</div>");
            }
        }(incomingFile, filename));
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
            incomingReadStream.pipe(fs.createWriteStream(jsonStoreFile));
        } else if (path.extname(filename) === ".xml") {
            //var processingName = path.resolve(processingDirectory, filename);
            // preserve the current XML by copying it to /srv/target which will be accessed via a link in the first column of the results table
            var configStoreFile = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            var configQueuedFile = path.resolve(processingDirectory + "/queued", filename);
            console.log('configStoreFile: ' + configStoreFile);
            // this move is within the same volume so we can do it this easy way
            fs.copySync(incomingFile, configQueuedFile);
            console.log('copied XML from validated to queued: ' + filename);
            resultsFile.write("<div>copied XML from validated to queued: " + filename + "</div>");
            console.log('copying XML from queued to target: ' + filename);
            resultsFile.write("<div>copying XML from queued to target: " + filename + "</div>");
            // this move is not within the same volume
            incomingReadStream.pipe(fs.createWriteStream(configStoreFile));
        } else if (path.extname(filename) === ".uml") {
            // preserve the generated UML to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            console.log('copying UML from validated to target: ' + incomingFile);
            resultsFile.write("<div>copying UML from validated to target: " + incomingFile + "</div>");
            incomingReadStream.pipe(fs.createWriteStream(targetName));
        } else if (path.extname(filename) === ".svg") {
            // preserve the generated UML SVG to be accessed via a link in the results table
            var targetName = path.resolve(targetDirectory + "/" + fileNamePart, filename);
            //fs.renameSync(incomingFile, targetName);
            console.log('copying SVG from validated to target: ' + filename);
            resultsFile.write("<div>copying SVG from validated to target: " + filename + "</div>");
            incomingReadStream.pipe(fs.createWriteStream(targetName));
        } else if (path.extname(filename) === ".xsd") {
            // place the generated XSD file for use in XML editors
            var targetName = path.resolve(targetDirectory, filename);
            console.log('copying XSD from validated to target: ' + filename);
            resultsFile.write("<div>copying XSD from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            incomingReadStream.pipe(fs.createWriteStream(targetName));
        } else if (filename.endsWith("frinex.html")) {
            // place the generated documentation file for use in web browsers
            var targetName = path.resolve(targetDirectory, filename);
            console.log('copying HTML from validated to target: ' + filename);
            resultsFile.write("<div>copying HTML from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, targetName);
            incomingReadStream.pipe(fs.createWriteStream(targetName));
        } else if (filename.endsWith("_validation_error.txt")) {
            var configErrorFile = path.resolve(targetDirectory + "/" + fileNamePart.substring(0, fileNamePart.length - "_validation_error".length), filename);
            console.log('copying from validated to target: ' + filename);
            resultsFile.write("<div>copying from validated to target: " + filename + "</div>");
            //fs.renameSync(incomingFile, processingName);
            incomingReadStream.pipe(fs.createWriteStream(configErrorFile));
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
                    resultsFile.write("<div>has more files in processing</div>");
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
    resultsFile.write("<div>Converting JSON to XML, '" + new Date().toISOString() + "'</div>");
    var dockerString = 'docker run'
        //+ ' --user "$(id -u):$(id -g)"'
        + ' -v incomingDirectory:/FrinexBuildService/incoming'
        + ' -v processingDirectory:/FrinexBuildService/processing'
        + ' -v listingDirectory:/FrinexBuildService/listing'
        + ' -v m2Directory:/maven/.m2/'
        + ' -w /ExperimentTemplate/ExperimentDesigner'
        + ' frinexapps:latest /bin/bash -c "mvn exec:exec'
        + ' -gs /maven/.m2/settings.xml'
        + ' -Dexec.executable=java'
        + ' -Dexec.classpathScope=runtime'
        + ' -Dexec.args=\\"-classpath %classpath nl.mpi.tg.eg.experimentdesigner.util.JsonToXml /FrinexBuildService/incoming/queued /FrinexBuildService/processing/validated /FrinexBuildService/listing\\";'
        + ' chmod a+rwx /FrinexBuildService/processing/validated/* /FrinexBuildService/listing/*;"';
    //+ " &> " + targetDirectory + "/JsonToXml_" + new Date().toISOString() + ".log";
    console.log(dockerString);
    try {
        execSync(dockerString, { stdio: [0, 1, 2] });
        console.log("convert JSON to XML finished");
        resultsFile.write("<div>Conversion from JSON to XML finished, '" + new Date().toISOString() + "'</div>");
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
