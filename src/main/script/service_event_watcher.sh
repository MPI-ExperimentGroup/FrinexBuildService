#!/bin/bash
SETTLE_DELAY=15
sudo docker events --filter type=container --format '{{.Time}} {{.Action}} {{.Actor.ID}}' | while read -r timestamp action container_id; do
    if [[ "$service" =~ ^.*_(admin|web)_[0-9]+$ ]]; then
        if [[ "$action" =~ start|running|stop|die ]]; then
            service=$(sudo docker inspect -f '{{index .Config.Labels "com.docker.swarm.service.name"}}' "$container_id" 2>/dev/null || echo "N/A")
            node_id=$(sudo docker inspect -f '{{index .Config.Labels "com.docker.swarm.node.id"}}' "$container_id" 2>/dev/null || echo "")
            if [[ -n "$node_id" ]]; then
                if [[ "$action" =~ start|running ]]; then
                    sleep "$SETTLE_DELAY"
                    node=$(sudo docker node inspect "$node_id" --format '{{.Description.Hostname}}' 2>/dev/null || echo "N/A")
                    ports=$(sudo docker inspect -f '{{range $c,$p := .NetworkSettings.Ports}}{{$c}} -> {{(index $p 0).HostPort}} {{end}}' "$container_id" 2>/dev/null || echo "N/A")
                    host_ports=$(echo "$ports" | sed -E 's/.*-> ([0-9]+).*/\1/')
                    running=$(sudo docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null || echo "false")
                    if [[ "$running" == "true" ]]; then
                        echo "service started: $service | Node: $node | Host ports: $host_ports"
                        curl -k PROXY_UPDATE_TRIGGER
                    else
                        echo "service not started: $service"
                    fi
                else
                    echo "service stopped: $service"
                    curl -k PROXY_UPDATE_TRIGGER
                fi
            else
                echo "node not found, skipping $service"
            fi
        fi
    fi
done
