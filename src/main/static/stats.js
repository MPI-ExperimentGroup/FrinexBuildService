/*
 * Copyright (C) 2022 Max Planck Institute for Psycholinguistics
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
 * @since 05 October 2022 15:46 PM (creation date)
 * @author Peter Withers <peter.withers@mpi.nl>
 */

function loadStats(experimentList) {
    var statFileArray = ['staging_public_stats', 'productionBQ4_public_stats', 'productionBQ4pre2022-08-26_public_stats', 'production_public_stats'];
    statFileArray.forEach(function (statFile, index) {
        $.getJSON('../' + statFile + '.json', (function (statFile, experimentList) {
            return function (data) {
                experimentList.forEach(function (experimentName, index) {
                    if (experimentName in data) {
                        $.each(data[experimentName].frinexVersion, function (key, value) {
                            $("#resultsTable").append("<tr><td>" + statFile + "</td><td>" + experimentName + "</td><td>" + key + "</td><td>" + value.first_use + "</td><td>" + value.last_use + "</td><td>" + value.distinct_users + "</td><td>" + value.page_loads + "</td></tr>")
                        });
                    } else {
                        $("#resultsTable").append("<tr><td>" + statFile + "</td><td>" + experimentName + "</td><td>Not Found</td><td></td><td></td><td></td><td></td></tr>")
                    }
                });
            };
        }(statFile, experimentList)));
    });
}

function experimentsPerYear() {
    var statFileArray = ['staging_public_stats', 'productionBQ4_public_stats', 'productionBQ4pre2022-08-26_public_stats', 'production_public_stats'];
    statFileArray.forEach(function (statFile, index) {
        $("#experimentTotals").append("<table id='" + statFile + "Totals'><tr><td>" + statFile + " Totals</td><td>Year</td><td>Total</td></tr></table>");
        $("#experimentCounts").append("<table id='" + statFile + "Counts'><tr><td>" + statFile + " Counts</td><td>Experiment</td><td>firstParticipantSeen</td><td>lastParticipantSeen</td><td>totalParticipantsSeen</td><td>totalPageLoads</td></tr></table>");
        $.getJSON('../' + statFile + '.json', (function (statFile) {
            return function (data) {
                $.each(data, function (key, value) {
                    if (value.firstParticipantSeen) {
                        $("#" + statFile + "Counts").append("<tr><td>" + statFile + "</td><td>" + key + "</td><td>" + value.firstParticipantSeen.substring(0,4) + "</td><td>" + value.lastParticipantSeen.substring(0,4) + "</td><td>" + value.totalParticipantsSeen + "</td><td>" + value.totalPageLoads + "</td></tr>")
                        for (year = parseInt(value.firstParticipantSeen.substring(0,4)); year <= parseInt(value.lastParticipantSeen.substring(0,4)); year++) {                
                            console.log(statFile);
                            console.log(key);
                            console.log(year);
                            console.log(value.firstParticipantSeen);
                            console.log(value.lastParticipantSeen);
                            if ($("#" + statFile + "_" + year).length === 0) {
                                $("#" + statFile + "Totals").append("<tr><td>" + statFile + "</td><td>" + year + "</td><td id='" + statFile + "_" + year + "'>0</td></tr>");
                            }
                            $("#" + statFile + "_" + year).text(parseInt($("#" + statFile + "_" + year).text()) + 1);
                        }
                    }
                });
            };
        }(statFile)));
    });
}

function loadUnkownBQ4() {
    loadStats(['ausimplereactiontime_bq4_timestudy', 'visimplereactiontime_bq4_timestudy', 'picturenaming_bq4_timestudy', 'sentencegeneration_bq4_timestudy', 'sentencemonitoring_bq4_timestudy', 'werkwoorden_bq4_timestudy']);
}

function loadSession1BQ4() {
    loadStats(['s3ausimplereactiontime', 's2visimplereactiontime', 's2picturenaming', 's3sentencegeneration', 's3sentencemonitoring', 's2werkwoorden']);
}

function loadSession2BQ4() {
    loadStats(['mpiausimplereactiontime', 'mpivisimplereactiontime', 'mpipicturenaming', 'mpisentencegeneration', 'mpisentencemonitoring', 'mpiwerkwoorden']);
}
