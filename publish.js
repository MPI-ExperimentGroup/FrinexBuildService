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
 * Prerequisites for this script:
 *        npm install request
 */

var request = require('request');

request('http://localhost:8080/ExperimentDesigner/listing', function (error, response, body) {
    if (!error && response.statusCode === 200) {
        console.log(body);
        var listing = JSON.parse(body);
        for (index = 0; index < listing.length; index++) {
            console.log(listing[index]);
        }
    }
});