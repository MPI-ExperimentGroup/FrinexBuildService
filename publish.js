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
 */

var request = require('request');
var execSync = require('child_process').execSync;
var http = require('http');
var fs = require('fs');
var configServer = 'http://localhost:8080/ExperimentDesigner';
var destinationServer = 'localhost';
var destinationServerUrl = 'http://localhost:8080';
// it is assumed that git update has been called before this script is run

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

buildApk = function () {
    console.log("starting cordova build");
    execSync('bash gwt-cordova/target/setup-cordova.sh');
    console.log("build cordova finished");
}

buildExperiment = function (listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        console.log(currentEntry);
        // get the configuration file
        var request = http.get(configServer + "/configuration/" + currentEntry.buildName, function (response) {
            if (response.statusCode === 200) {
                var outputFile = fs.createWriteStream("frinex-rest-output/" + currentEntry.buildName + ".xml");
                response.pipe(outputFile);

                // we create a new mvn instance for each child pom
                var mvngui = require('maven').create({
                    cwd: __dirname + "/gwt-cordova"
                });
                mvngui.execute(['clean', 'install', 'tomcat7:redeploy'], {'skipTests': true, '-pl': 'frinex-gui',
                    'experiment.configuration.name': currentEntry.buildName,
                    'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                    'experiment.webservice': configServer,
                    'experiment.destinationServer': destinationServer,
                    'experiment.destinationServerUrl': destinationServerUrl
                }).then(function (value) {
                    console.log("frinex-gui finished");
                    // build cordova 
                    buildApk();
                    console.log("buildApk finished");
                    var mvnadmin = require('maven').create({
                        cwd: __dirname + "/registration"
                    });
                    mvnadmin.execute(['clean', 'install', 'tomcat7:redeploy'], {'skipTests': true, '-pl': 'frinex-admin',
                        'experiment.configuration.name': currentEntry.buildName,
                        'experiment.configuration.displayName': currentEntry.experimentDisplayName,
                        'experiment.webservice': configServer,
                        'experiment.destinationServer': destinationServer,
                        'experiment.destinationServerUrl': destinationServerUrl}).then(function (value) {
                        console.log(value);
                        console.log("frinex-admin finished");
                        buildExperiment(listing);
                    }, function (reason) {
                        console.log(reason);
                        console.log("frinex-admin failed");
                        buildExperiment(listing);
                    });
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-gui failed");
                    buildExperiment(listing);
                });
            } else {
                console.log("loading listing from frinex-experiment-designer failed");
                buildExperiment(listing);
            }
        });
    } else {
        console.log("build process from frinex-experiment-designer listing completed");
    }
};