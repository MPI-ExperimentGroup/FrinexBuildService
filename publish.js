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

var configServer = 'http://localhost:8080/frinex-experiment-designer';
var destinationServer = 'localhost';
var destinationServerUrl = 'http://localhost:8080';

// it is assumed that git update has been called before this script is run

var mvn = require('maven').create({
    cwd: __dirname
});

//mvn.execute(['clean', 'install', 'tomcat7:redeploy'], {'skipTests': true, '-pl': 'frinex-experiment-designer',
//    'experiment.destinationName': destinationServer,
//    'experiment.destinationUrl': destinationServerUrl}).then(function (value) {
//    console.log(value);
//    console.log("frinex-experiment-designer finished");
request(configServer + '/listing', function (error, response, body) {
    if (!error && response.statusCode === 200) {
        console.log(body);
        var listing = JSON.parse(body);
        console.log(__dirname);
        buildExperiment(mvn, listing);
    }
});
//}, function (reason) {
//    console.log(reason);
//    console.log("frinex-experiment-designer failed");
//});

buildExperiment = function (mvn, listing) {
    if (listing.length > 0) {
        var currentEntry = listing.pop();
        console.log(currentEntry);
        mvn.execute(['clean', 'install'], {'skipTests': true, '-pl': 'frinex-parent', 'experiment.configuration.name': currentEntry.buildName,
            'experiment.webservice': configServer,
            'experiment.destinationName': destinationServer,
            'experiment.destinationUrl': destinationServerUrl
        }).then(function (value) {
            console.log(value);
            console.log("frinex-parent finished");
            mvn.execute(['clean', 'install', 'tomcat7:redeploy'], {'skipTests': true, '-pl': 'frinex-gui', 'experiment.configuration.name': currentEntry.buildName,
                'experiment.webservice': configServer,
                'experiment.destinationName': destinationServer,
                'experiment.destinationUrl': destinationServerUrl
            }).then(function (value) {
                console.log(value);
                console.log("frinex-gui finished");
                mvn.execute(['clean', 'install', 'tomcat7:redeploy'], {'skipTests': true, '-pl': 'frinex-admin', 'experiment.configuration.name': currentEntry.buildName,
                    'experiment.webservice': configServer,
                    'experiment.destinationName': destinationServer,
                    'experiment.destinationUrl': destinationServerUrl}).then(function (value) {
                    console.log(value);
                    console.log("frinex-admin finished");
                    buildExperiment(mvn, listing);
                }, function (reason) {
                    console.log(reason);
                    console.log("frinex-admin failed");
                });
            }, function (reason) {
                console.log(reason);
                console.log("frinex-gui failed");
            });
        }, function (reason) {
            console.log(reason);
            console.log("frinex-parent failed");
        });
    }
};