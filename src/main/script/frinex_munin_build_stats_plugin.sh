#!/bin/bash
#
# Copyright (C) 2022 Max Planck Institute for Psycholinguistics
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
#

#
# @since 03 May 2022 15:53 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This munin plugin gets the build times from Frinex build servers

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir
dataDirectory=/Users/petwit/Documents/FrinexBuildService/frinex_munin_data/builds

output_config() {
    echo "graph_title Frinex $1 Build Stats"
    echo "graph_category frinex"
    echo "staging_web_$1.label staging_web_$1"
    echo "staging_admin_$1.label staging_admin_$1"
    echo "staging_desktop_$1.label staging_desktop_$1"
    echo "production_web_$1.label production_web_$1"
    echo "production_admin_$1.label production_admin_$1"
    echo "production_desktop_$1.label production_desktop_$1"
    echo "staging_android_$1.label staging_android_$1"
}


output_values() {
        cat $dataDirectory/build_stats_$1
        load_build_stats $1 > $dataDirectory/build_stats_$1&
}

load_build_stats() {
    echo $(curl --connect-timeout 10 --max-time 10 --fail-early --silent -H 'Content-Type: application/json' http://$1/buildstats.json | grep -v '}' | grep -v '{' | sed 's/"//g' | sed 's/,//g' | sed 's/ //g' | sed 's/:/_$1.value /g')
}

output_usage() {
    printf >&2 "%s - munin plugin to show the Frinex build times.\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

linkName=$(basename $0)
case $# in
    0)
        output_values ${linkName#"frinex_build_"}
        ;;
    1)
        case $1 in
            config)
                output_config ${linkName#"frinex_build_"}
                ;;
            *)
                output_values $1
                ;;
        esac
        ;;
    2)
        case $2 in
            config)
                output_config $1
                ;;
            *)
                output_usage
                exit 1
                ;;
        esac
        ;;
    *)
        output_usage
        exit 1
        ;;
esac
