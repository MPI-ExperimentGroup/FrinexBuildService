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
# @since 12 July 2022 17:33 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# This munin plugin gets the number of Frinex experiment services on each node in the docker swarm

cd $(dirname "$0")
scriptDir=$(pwd -P)
#echo $scriptDir

output_config() {
    echo "graph_title Frinex Swarm Node Stats"
    echo "graph_category frinex"
    for nodeName in ${1//_/ }
    do
        echo "frinex_swarm_node_$nodeName.label $nodeName"
    done
}


output_values() {
    for nodeName in ${1//_/ }
    do
        echo "frinex_swarm_node_$nodeName.value "$(docker node ps $nodeName | grep -E "_admin|_web" | grep Running | wc -l)
    done
}

output_usage() {
    printf >&2 "%s - munin plugin to show the number of Frinex experiment services on each node in the docker swarm.\n" ${0##*/}
    printf >&2 "Usage: %s [config]\n" ${0##*/}
}

linkName=$(basename $0)
case $# in
    0)
        output_values ${linkName#"frinex_swarm_nodes_"}
        ;;
    1)
        case $1 in
            config)
                output_config ${linkName#"frinex_swarm_nodes_"}
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
