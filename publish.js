#!/usr/bin/env node
/*
 * Copyright (C) 2015 Max Planck Institute for Psycholinguistics
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
 * @since Dec 23, 2015 1:01:50 PM (creation date)
 * @author Peter Withers <peter.withers@mpi.nl>
 */

/*
 * This script is intended to query the Frinex Designer webservice and build each experiment that has been set to the published state but has not yet been built.
 * 
 * Prerequisites for this script:
 *        npm install request
 *        npm install maven
 *        npm install properties-reader
 */

var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('publish.properties');
var request = require('request');
var execSync = require('child_process').execSync;
var http = require('http');
var fs = require('fs');
var m2Settings = properties.get('settings.m2Settings');
var configServer = properties.get('webservice.configServer');
var stagingServer = properties.get('staging.serverName');
var stagingServerUrl = properties.get('staging.serverUrl');
var stagingGroupsSocketUrl = properties.get('staging.groupsSocketUrl');
var configServer = properties.get('webservice.configServer');
var productionServer = properties.get('production.serverName');
var productionServerUrl = properties.get('production.serverUrl');
var productionGroupsSocketUrl = properties.get('production.groupsSocketUrl');

// it is assumed that git update has been called before this script is run

buildFromListing = function () {
    request(configServer + '/listing', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            console.log(body);
            var listing = JSON.parse(body);
            console.log(__dirname);
            buildExperiment(listing);
        } else {
            console.log("loading listing from frinex-experiment-designer failed");
        }
    });
}

installDesignServer = function () {
    var mvngui = require('maven').create({
        cwd: __dirname + "/ExperimentDesigner",
        settings: m2Settings
    });
    mvngui.execute(['clean', 'tomcat7:redeploy'], {
        'skipTests': true, '-pl': 'ExperimentDesigner',
        'destination.name': 'ExperimentDesigner',
        'experiment.destinationServer': stagingServer,
        'experiment.destinationServerUrl': stagingServerUrl
    }).then(function (value) {
//        console.log(value);
        console.log("ExperimentDesigner finished");
        console.log("Waiting before buildFromListing");
        setTimeout(buildFromListing, 60000);
    }, function (reason) {
        console.log(reason);
        console.log("ExperimentDesigner failed");
    });
};

buildApk = function () {
    console.log("starting cordova build");
    execSync('bash gwt-cordova/target/setup-cordova.sh');
    console.log("build cordova finished");
};

buildElectron = function () {
    console.log("starting electron build");
    execSync('bash gwt-cordova/target/setup-electron.sh');
    console.log("build electron finished");
};

buildExperiment = function (listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        console.log(currentEntry);
        // get the configuration file
        var request = http.get(configServer + "/configuration/" + currentEntry.buildName, function (response) {
            if (response.statusCode === 200) {
                var outputFile = fs.createWriteStream("frinex-rest-output/" + currentEntry.buildName + ".xml");
                response.pipe(outputFile);
//                console.log("starting generate stimulus");
//                execSync('bash gwt-cordova/target/generated-sources/bash/generateStimulus.sh');
//                
                // we create a new mvn instance for each child pom
                var mvngui = require('maven').create({
                    cwd: __dirname + "/gwt-cordova",
                    settings: m2Settings
                });
                mvngui.execute(['clean', 'install'], {
//                mvngui.execute(['clean', 'gwt:run'], {
                    'skipTests': true, '-pl': 'frinex-gui',
                    'experiment.configuration.name': currentEntry.buildName,
                    'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                    'experiment.webservice': configServer,
                    'experiment.destinationServer': stagingServer,
                    'experiment.destinationServerUrl': stagingServerUrl,
                    'experiment.groupsSocketUrl': stagingGroupsSocketUrl,
                    'experiment.isScaleable': currentEntry.isScaleable,
                    'experiment.defaultScale': currentEntry.defaultScale
//                    'experiment.scriptSrcUrl': stagingServerUrl,
//                    'experiment.staticFilesUrl': stagingServerUrl
                }).then(function (value) {
                    console.log("frinex-gui finished");
                    // build cordova 
//                    buildApk();
//                    console.log("buildApk finished");
                    buildElectron();
                    var mvnadmin = require('maven').create({
                        cwd: __dirname + "/registration",
                        settings: m2Settings
                    });
                    mvnadmin.execute(['clean', 'install'], {
                        'skipTests': true, '-pl': 'frinex-admin',
                        'experiment.configuration.name': currentEntry.buildName,
                        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                        'experiment.webservice': configServer,
                        'experiment.destinationServer': stagingServer,
                        'experiment.destinationServerUrl': stagingServerUrl
                    }).then(function (value) {
                        console.log(value);
//                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
                        console.log("frinex-admin finished");
//                        console.log(productionServerUrl + '/' + currentEntry.buildName);
//                        http.get(productionServerUrl + '/' + currentEntry.buildName, function (response) {
//                            if (response.statusCode !== 404) {
//                                console.log("existing frinex-gui production found, aborting build!");
//                                console.log(response.statusCode);
//                            } else {
//                                console.log(response.statusCode);
//                                mvngui.execute(['clean', 'tomcat7:deploy'/*, 'gwt:run'*/], {
//                                    'skipTests': true, '-pl': 'frinex-gui',
////                    'altDeploymentRepository.snapshot-repo.default.file': '~/Desktop/FrinexAPKs/',
////                    'altDeploymentRepository': 'default:file:file://~/Desktop/FrinexAPKs/',
////                            'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
////                    'maven.repo.local': '~/Desktop/FrinexAPKs/',
//                                    'experiment.configuration.name': currentEntry.buildName,
//                                    'experiment.configuration.displayName': currentEntry.experimentDisplayName,
//                                    'experiment.webservice': configServer,
//                                    'experiment.destinationServer': productionServer,
//                                    'experiment.destinationServerUrl': productionServerUrl,
//                                    'experiment.groupsSocketUrl': productionGroupsSocketUrl,
//                                    'experiment.isScaleable': currentEntry.isScaleable,
//                                    'experiment.defaultScale': currentEntry.defaultScale
////                            'experiment.scriptSrcUrl': productionServerUrl,
////                            'experiment.staticFilesUrl': productionServerUrl
//                                }).then(function (value) {
//                                    console.log("frinex-gui production finished");
//                                    mvnadmin.execute(['clean', 'tomcat7:deploy'], {
//                                        'skipTests': true, '-pl': 'frinex-admin',
////                                'altDeploymentRepository': 'snapshot-repo::default::file:./FrinexWARs/',
//                                        'experiment.configuration.name': currentEntry.buildName,
//                                        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
//                                        'experiment.webservice': configServer,
//                                        'experiment.destinationServer': productionServer,
//                                        'experiment.destinationServerUrl': productionServerUrl
//                                    }).then(function (value) {
//                                        console.log(value);
////                        fs.createReadStream(__dirname + "/registration/target/"+currentEntry.buildName+"-frinex-admin-0.1.50-testing.war").pipe(fs.createWriteStream(currentEntry.buildName+"-frinex-admin-0.1.50-testing.war"));
//                                        console.log("frinex-admin production finished");
                        buildExperiment(listing);
//                                    }, function (reason) {
//                                        console.log(reason);
//                                        console.log("frinex-admin production failed");
//                                        console.log(currentEntry.experimentDisplayName);
////                                buildExperiment(listing);
//                                    });
//                                }, function (reason) {
//                                    console.log(reason);
//                                    console.log("frinex-gui production failed");
//                                    console.log(currentEntry.experimentDisplayName);
////                            buildExperiment(listing);
//                                });
//                            }
//                        });
                    }, function (reason) {
                        console.log(reason);
                        console.log("frinex-admin staging failed");
                        console.log(currentEntry.experimentDisplayName);
//                        buildExperiment(listing);
                    });
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-gui staging failed");
                    console.log(currentEntry.experimentDisplayName);
//                    buildExperiment(listing);
                });
            } else {
                console.log("loading listing from frinex-experiment-designer failed");
//                buildExperiment(listing);
            }
        });
    } else {
        console.log("build process from frinex-experiment-designer listing completed");
    }
};

buildGuiOnly = function (listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        console.log(currentEntry);
        // we create a new mvn instance for each child pom
        var mvngui = require('maven').create({
            cwd: __dirname + "/gwt-cordova",
            settings: m2Settings
        });
        mvngui.execute(['clean', 'tomcat7:redeploy'], {
//                mvngui.execute(['clean', 'gwt:run'], {
            'skipTests': true, '-pl': 'frinex-gui',
            'experiment.configuration.name': currentEntry.buildName,
            'experiment.configuration.displayName': currentEntry.experimentDisplayName,
            'experiment.webservice': configServer,
            'experiment.destinationServer': stagingServer,
            'experiment.destinationServerUrl': stagingServerUrl,
//                    'experiment.scriptSrcUrl': stagingServerUrl,
//                    'experiment.staticFilesUrl': stagingServerUrl
        }).then(function (value) {
            console.log("frinex-gui finished");
            // build cordova 
            buildApk();
            console.log("buildApk finished");
            buildExperiment(listing);
        }, function (reason) {
            console.log(reason);
            console.log("frinex-gui staging failed");
            console.log(currentEntry.experimentDisplayName);
//                    buildExperiment(listing);
        });
    } else {
        console.log("loading listing from frinex-experiment-designer failed");
//                buildExperiment(listing);
    }
};
//buildGuiOnly([{"compileDate": "2016-07-30", "expiryDate": "2016-07-30", "isWebApp": true, "isiOS": true, "isAndroid": true, "buildName": "rosselfieldkit", "state": "published", "experimentInternalName": "rosselfieldkit", "experimentDisplayName": "RosselFieldKit"}]);

//installDesignServer();
buildFromListing();
