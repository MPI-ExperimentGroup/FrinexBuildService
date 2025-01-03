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
 * @since 26 Jan 2022 14:17 PM (creation date)
 * @author Peter Withers <peter.withers@mpi.nl>
 */

var applicationStatus = {};
var applicationStatusReplicas = {};
var serviceStatusHealth = {};
var applicationStatusHealth = {};

function updateDeploymentStatus(keyString, cellString, cellStyle) {
    var experimentCell = document.getElementById(keyString + cellString);
    if (experimentCell) {
        var statusStyle = (keyString + cellString in applicationStatus) ? ';border-right: 3px solid ' + applicationStatus[keyString + cellString] + ';' : '';
        experimentCell.style = cellStyle + statusStyle;
    }
    if (applicationStatusReplicas[keyString + cellString] || applicationStatusHealth[keyString + cellString]) {
        var statusMessage = document.getElementById(keyString + cellString + '_status');
        if (!statusMessage) {
            statusMessage = document.createElement('span');
            statusMessage.id = keyString + cellString + '_status';
            statusMessage.className = 'longmessage';
            experimentCell.appendChild(statusMessage);
        }
        statusMessage.innerHTML = ((applicationStatusReplicas[keyString + cellString]) ? 'replicas: ' + applicationStatusReplicas[keyString + cellString] + '<br/>' : '')
            + ((serviceStatusHealth[keyString + cellString]) ? "service<br/>" + serviceStatusHealth[keyString + cellString] : "service: unknown<br/>")
            + ((applicationStatusHealth[keyString + cellString]) ? "proxy<br/>" + applicationStatusHealth[keyString + cellString] : "proxy: unknown");
    }
}

function updateAggregateStatus() {
    var aggregateStagingWebServiceCount = 0;
    var aggregateStagingWebServiceOK = 0;
    var aggregateStagingWebProxyFail = 0;
    var aggregateStagingWebProxy502 = 0;
    var aggregateStagingWebProxyOK = 0;
    var aggregateStagingAdminServiceCount = 0;
    var aggregateStagingAdminServiceOK = 0;
    var aggregateStagingAdminProxyFail = 0;
    var aggregateStagingAdminProxy502 = 0;
    var aggregateStagingAdminProxyOK = 0;
    var aggregateProductionWebServiceCount = 0;
    var aggregateProductionWebServiceOK = 0;
    var aggregateProductionWebProxyOK = 0;
    var aggregateProductionAdminServiceCount = 0;
    var aggregateProductionAdminServiceOK = 0;
    var aggregateProductionAdminProxyOK = 0;
    for (var key of Object.keys(applicationStatusReplicas)) {
        // isRunning = (serviceStatusHealth[key] !== '') ? 1 : 0;
        serviceRunning = (serviceStatusHealth[key]) ? 1 : 0;
        proxyRunning = (applicationStatusHealth[key]) ? 1 : 0;
        if (key.includes("_staging_web")) {
            aggregateStagingWebServiceCount++;
            aggregateStagingWebServiceOK += serviceRunning;
            aggregateStagingWebProxyOK += proxyRunning;
        }
        if (key.includes("_staging_admin")) {
            aggregateStagingAdminServiceCount++;
            aggregateStagingAdminServiceOK += serviceRunning;
            aggregateStagingAdminProxyOK += proxyRunning;
        }
        if (key.includes("_production_web")) {
            aggregateProductionWebServiceCount++;
            aggregateProductionWebServiceOK += serviceRunning;
            aggregateProductionWebProxyOK += proxyRunning;
        }
        if (key.includes("_production_admin")) {
            aggregateProductionAdminServiceCount++;
            aggregateProductionAdminServiceOK += serviceRunning;
            aggregateProductionAdminProxyOK += proxyRunning;
        }
    }

    $("#aggregateStagingWebServiceOK").width((aggregateStagingWebServiceOK / aggregateStagingWebServiceCount * 100) + "%");
    $("#aggregateStagingWebProxyOK").width((aggregateStagingWebProxyOK / aggregateStagingWebServiceCount * 100) + "%");
    $("#aggregateStagingAdminServiceOK").width((aggregateStagingAdminServiceOK / aggregateStagingAdminServiceCount * 100) + "%");
    $("#aggregateStagingAdminProxyOK").width((aggregateStagingAdminProxyOK / aggregateStagingAdminServiceCount * 100) + "%");
    // $("#aggregateProductionWebServiceOK").width((aggregateStagingWebServiceOK / aggregateStagingWebServiceCount * 100) + "%");
    // $("#aggregateProductionAdminServiceOK").width((aggregateProductionAdminServiceOK / aggregateProductionAdminServiceCount * 100) + "%");
}

function doUpdate() {
    clearTimeout(updateTimer);
    updateTimer = window.setTimeout(doUpdate, 60000);
    $.getJSON('buildhistory.json?' + new Date().getTime(), function (data) {
        //console.log(data);
        // update the update aggregate status here before all the values start changing while the getJSON requests gradually return
        updateAggregateStatus();
        for (var keyString in data.table) {
            //console.log(keyString);
            var experimentRow = document.getElementById(keyString + '_row');
            if (!experimentRow) {
                var tableRow = document.createElement('tr');
                experimentRow = tableRow;
                tableRow.id = keyString + '_row';
                for (var cellString of ['_repository', '_committer', '_experiment', '_date', '_frinex_version', '_validation_json_xsd', '_staging_web', '_staging_android', '_staging_desktop', '_staging_admin', '_production_target', '_production_web', '_production_android', '_production_desktop', '_production_admin']) {
                    var tableCell = document.createElement('td');
                    tableCell.id = keyString + cellString;
                    tableRow.appendChild(tableCell);
                }
                document.getElementById('buildTable').appendChild(tableRow);
                // check the spring health here and show http and db status via applicationStatus array
                // getting the health of the experiment admin and web
                // the path -admin/health is for spring boot 1.4.1
                // $.getJSON(data.stagingServerUrl + '/' + keyString + '-admin/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_staging_admin'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_staging_admin'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_staging_admin'] = 'yellow';
                //                 } else {
                //                     applicationStatus[experimentName + '_staging_admin'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_staging_admin', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_staging_admin'].style)));
                // this request is for spring boot 1.4.1 and Frinex only had a single production server at that time, so we only check the default server here
                // $.getJSON(data.productionServerUrl + '/' + keyString + '-admin/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_production_admin'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_production_admin'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_production_admin'] = 'yellow';
                //                 } else {
                //                     applicationStatus[experimentName + '_production_admin'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_production_admin', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_production_admin'].style)));
                // the path -admin/actuator/health is for spring boot 2.3.0
                // $.getJSON(data.stagingServerUrl + '/' + keyString + '-admin/actuator/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_staging_admin'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_staging_admin'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_staging_admin'] = 'green';
                //                 } else {
                //                     applicationStatus[experimentName + '_staging_admin'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_staging_admin', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_staging_admin'].style)));
                // $.getJSON(((typeof data.table[keyString]['_production_target'] !== 'undefined' && data.table[keyString]['_production_target'].value != '') ? data.table[keyString]['_production_target'].value : data.productionServerUrl) + '/' + keyString + '-admin/actuator/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_production_admin'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_production_admin'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_production_admin'] = 'green';
                //                 } else {
                //                     applicationStatus[experimentName + '_production_admin'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_production_admin', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_production_admin'].style)));
                // get the health of the GUI
                // $.getJSON(data.stagingServerUrl + '/' + keyString + '/actuator/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_staging_web'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_staging_web'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_staging_web'] = 'green';
                //                 } else {
                //                     applicationStatus[experimentName + '_staging_web'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_staging_web', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_staging_web'].style)));
                // $.getJSON(((typeof data.table[keyString]['_production_target'] !== 'undefined' && data.table[keyString]['_production_target'].value != '') ? data.table[keyString]['_production_target'].value : data.productionServerUrl) + '/' + keyString + '/actuator/health', (function (experimentName, cellStyle) {
                //     return function (data) {
                //         applicationStatusHealth[experimentName + '_production_web'] = '';
                //         $.each(data, function (key, val) {
                //             applicationStatusHealth[experimentName + '_production_web'] += key + ': ' + val + '<br/>';
                //             if (key === 'status') {
                //                 if (val === 'UP') {
                //                     applicationStatus[experimentName + '_production_web'] = 'green';
                //                 } else {
                //                     applicationStatus[experimentName + '_production_web'] = 'red';
                //                 }
                //                 updateDeploymentStatus(experimentName, '_production_web', cellStyle);
                //             }
                //         });
                //     };
                // }(keyString, data.table[keyString]['_production_web'].style)));
            }
            // use the UTC date stored in a data attribute of the row to check if the row has changes before updating it
            if (data.table[keyString]['_date'].value !== experimentRow.dataset.lastchange) {
                experimentRow.dataset.lastchange = data.table[keyString]['_date'].value;
                for (var cellString in data.table[keyString]) {
                    //console.log(cellString);
                    var experimentCell = document.getElementById(keyString + cellString);
                    if (!experimentCell) {
                        var tableCell = document.createElement('td');
                        tableCell.id = keyString + cellString;
                        document.getElementById(keyString + '_row').appendChild(tableCell);
                    }
                    if (cellString === '_date') {
                        var currentBuildDate = new Date(data.table[keyString][cellString].value);
                        document.getElementById(keyString + cellString).innerHTML = currentBuildDate.getFullYear() + '-' + ((currentBuildDate.getMonth() + 1 < 10) ? '0' : '') + (currentBuildDate.getMonth() + 1) + '-' + ((currentBuildDate.getDate() < 10) ? '0' : '') + currentBuildDate.getDate() + 'T' + ((currentBuildDate.getHours() < 10) ? '0' : '') + currentBuildDate.getHours() + ':' + ((currentBuildDate.getMinutes() < 10) ? '0' : '') + currentBuildDate.getMinutes() + ':' + ((currentBuildDate.getSeconds() < 10) ? '0' : '') + currentBuildDate.getSeconds();
                    } else {
                        var buildTimeSting = (typeof data.table[keyString][cellString].ms !== 'undefined' && data.table[keyString][cellString].built) ? '&nbsp;(' + parseInt(data.table[keyString][cellString].ms / 60000) + ':' + ((data.table[keyString][cellString].ms / 1000 % 60 < 10) ? '0' : '') + parseInt(data.table[keyString][cellString].ms / 1000 % 60) + ')' : '';
                        document.getElementById(keyString + cellString).innerHTML = data.table[keyString][cellString].value + buildTimeSting;
                    }
                    //var statusStyle = ($.inArray(keyString + cellString, applicationStatus ) >= 0)?';border-right: 5px solid green;':';border-right: 5px solid grey;';
                    if (cellString === '_staging_web' || cellString === '_staging_admin' || cellString === '_production_web' || cellString === '_production_admin') {
                        updateDeploymentStatus(keyString, cellString, data.table[keyString][cellString].style);
                    } else if (!applicationStatusHealth[keyString + cellString]) {
                        // if the health status has not been set then set the provided style
                        document.getElementById(keyString + cellString).style = data.table[keyString][cellString].style;
                    }
                }
            }
        }
        if (typeof data.memoryTotal === 'undefined' || data.memoryTotal === null) {
            document.getElementById('memoryFree').innerHTML = '';
            document.getElementById('memoryFree').style.width = '0%';
        } else {
            var memoryFreeValue = Math.floor((data.memoryTotal - data.memoryFree) / data.memoryTotal * 100);
            document.getElementById('memoryFree').innerHTML = memoryFreeValue + '%&nbsp;memory';
            document.getElementById('memoryFree').style.width = memoryFreeValue + '%';
        }
        if (typeof data.diskTotal === 'undefined' || data.diskTotal === null) {
            document.getElementById('diskFree').innerHTML = '';
            document.getElementById('diskFree').style.width = '0%';
        } else {
            var diskFreeValue = Math.floor((data.diskTotal - data.diskFree) / data.diskTotal * 100);
            document.getElementById('diskFree').innerHTML = diskFreeValue + '%&nbsp;disk';
            document.getElementById('diskFree').style.width = diskFreeValue + '%';
        }
        if (typeof data.buildHost === 'undefined' || data.buildHost === null) {
            document.getElementById('buildLabel').innerHTML = 'Build Host Unknown';
        } else {
            document.getElementById('buildLabel').innerHTML = data.buildHost;
        }
        if (typeof data.certificateStatus === 'undefined' || data.certificateStatus === null) {
            document.getElementById('certificateStatus').innerHTML = '';
        } else {
            document.getElementById('certificateStatus').innerHTML = data.certificateStatus;
        }
        doSort();
        clearTimeout(updateTimer);
        if (data.building) {
            updateTimer = window.setTimeout(doUpdate, 1000);
            $("#buildProcessFinished").hide();
            $("#buildInProgress").show();
        } else {
            updateTimer = window.setTimeout(doUpdate, 10000);
            $("#buildInProgress").hide();
            $("#buildProcessFinished").show();
        }
        $.getJSON('services.json?' + new Date().getTime(), function (servicesData) {
            $.each(servicesData, function (key, val) {
                // console.log(key.replace("_staging", "_staging").replace("_production", "_production"));
                // console.log(val);
                // $("#" + key.replace("_staging", "_staging").replace("_production", "_production")).text(key);
                const deploymentStages = ["_staging_web", "_staging_admin", "_production_web", "_production_admin"]
                deploymentStages.forEach(function (deploymentStage, index) {
                    if (key.endsWith(deploymentStage)) {
                        const experimentName = key.replace(deploymentStage, "");
                        applicationStatusReplicas[key] = val.replicas;
                        // if (val.replicas.startsWith("0/")) {
                        //     applicationStatus[key] = 'red';
                        // } else {
                        //     const replicaParts = val.replicas.split("/");
                        //     if (replicaParts[0] === replicaParts[1]) {
                        //         applicationStatus[key] = 'green';
                        //     } else {
                        //         applicationStatus[key] = 'yellow';
                        //     }
                        // }
                        updateDeploymentStatus(experimentName, deploymentStage, data.table[experimentName][deploymentStage].style);
                        if (!serviceStatusHealth[experimentName + deploymentStage]) {
                            $.getJSON(window.location.protocol + '//' + window.location.hostname + ':' + val.port + '/' + key.replace("_staging", "").replace("_production", "").replace("_admin", "-admin").replace("_web", "") + '/actuator/health', (function (experimentName, cellStyle) {
                                return function (data) {
                                    serviceStatusHealth[experimentName + deploymentStage] = '';
                                    $.each(data, function (key, val) {
                                        serviceStatusHealth[experimentName + deploymentStage] += key + ': ' + val + '<br/>';
                                        if (key === 'status') {
                                            if (val === 'UP') {
                                                applicationStatus[experimentName + deploymentStage] = 'green';
                                            } else {
                                                applicationStatus[experimentName + deploymentStage] = 'red';
                                            }
                                            updateDeploymentStatus(experimentName, deploymentStage, cellStyle);
                                            updateAggregateStatus();
                                        }
                                    });
                                };
                            }(experimentName, data.table[experimentName][deploymentStage].style)))
                            /* .fail(function (jqxhr, textStatus, error) {
                                serviceStatusHealth[experimentName + deploymentStage] += error + ': ' + jqxhr.status + ': ' + textStatus + '<br/>';
                            })*/;
                        }
                        if (!applicationStatusHealth[experimentName + deploymentStage]) {
                            $.getJSON(((deploymentStage.includes("_staging_")) ? data.stagingServerUrl :
                                (typeof data.table[experimentName]['_production_target'] !== 'undefined' && data.table[experimentName]['_production_target'].value != '')
                                    ? data.table[experimentName]['_production_target'].value
                                    : data.productionServerUrl)
                                + '/' + experimentName + '/actuator/health', (function (experimentName, cellStyle) {
                                    return function (data) {
                                        applicationStatusHealth[experimentName + deploymentStage] = '';
                                        $.each(data, function (key, val) {
                                            applicationStatusHealth[experimentName + deploymentStage] += key + ': ' + val + '<br/>';
                                            if (key === 'status') {
                                                if (val === 'UP') {
                                                    applicationStatus[experimentName + deploymentStage] = 'green';
                                                } else {
                                                    applicationStatus[experimentName + deploymentStage] = 'red';
                                                }
                                                updateDeploymentStatus(experimentName, deploymentStage, cellStyle);
                                                updateAggregateStatus();
                                            }
                                        });
                                    };
                                }(experimentName, data.table[experimentName][deploymentStage].style)));
                        }
                    }
                });
            });
        });
    });
}
var updateTimer = window.setTimeout(doUpdate, 100);
function doSort() {
    var sortData = location.href.split('#')[1];
    var sortItem = (sortData) ? sortData.split('_')[0] : '4';
    var sortDirection = (sortData) ? sortData.split('_')[1] : 'd';
    if ($.isNumeric(sortItem)) {
        if (sortDirection === 'd') {
            $('#buildTable tr:gt(0)').each(function () { }).sort(function (b, a) { return $('td:nth-of-type(' + sortItem + ')', a).text().localeCompare($('td:nth-of-type(' + sortItem + ')', b).text()); }).appendTo('#buildTable tbody');
            $('#buildTable tr:first').children('td').children('a').each(function (index) { $(this).attr('href', '#' + (index + 1) + '_a') });
        } else {
            $('#buildTable tr:gt(0)').each(function () { }).sort(function (a, b) { return $('td:nth-of-type(' + sortItem + ')', a).text().localeCompare($('td:nth-of-type(' + sortItem + ')', b).text()); }).appendTo('#buildTable tbody');
            $('#buildTable tr:first').children('td').children('a').each(function (index) { $(this).attr('href', '#' + (index + 1) + '_d') });
        }
    }
}

function triggerBuild() {
    $.get("cgi/request_build.cgi", function (data) {
        console.log(data);
        clearTimeout(updateTimer);
        $('#buildTable tr:gt(0)').remove();
        doUpdate();
    });
}

$(window).on('hashchange', function (e) {
    doSort();
});
