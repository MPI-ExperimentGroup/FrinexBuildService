# frinex_synchronisation_service
# @since 07 October 2024 11:36 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
FROM alpine:3.14
RUN apk add --no-cache \
  curl \
  coreutils \
  bash \
  rsync \
  docker \
  openssh \
  sudo
RUN mkdir /FrinexBuildService/
COPY config/publish.properties /FrinexBuildService/
COPY script/frinex_synchronisation_service.sh /FrinexBuildService/
RUN dockerRegistry=$(grep dockerRegistry /FrinexBuildService/publish.properties | sed "s/dockerRegistry[ ]*=[ ]*//g" | tr -d "\n" | tr -d "\r"); sed -i "s/DOCKER_REGISTRY/$dockerRegistry/g" /FrinexBuildService/frinex_synchronisation_service.sh
RUN rm /FrinexBuildService/publish.properties

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker push [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]*' >> /etc/sudoers

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker pull [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker pull [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker pull [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker pull [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]*' >> /etc/sudoers

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:[0-9]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:[0-9]*' >> /etc/sudoers

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:stable' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:stable' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:stable' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:stable' >> /etc/sudoers

# used to delete stray images without tags
# RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-z0-9 ]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_web\:' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_staging_admin\:' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_web\:' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image rm [a-zA-Z0-9-_.]*/[a-z0-9-_]*_production_admin\:' >> /etc/sudoers

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker system prune -f' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker container prune -f' >> /etc/sudoers
# RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image prune -af' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker container ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker volume ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker system df' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker system prune -f' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image ls --format {{.Repository}}\:{{.Tag}}' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls --format {{.Name}}' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker node ps [a-zA-Z0-9-_.]*' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/sbin/sshd -D' >> /etc/sudoers

RUN adduser -S frinex
RUN echo "#!/bin/bash" > /FrinexBuildService/startup.sh
RUN echo "sudo /usr/sbin/sshd -D&" >> /FrinexBuildService/startup.sh
RUN echo "/FrinexBuildService/frinex_synchronisation_service.sh" >> /FrinexBuildService/startup.sh
RUN chown -R frinex /FrinexBuildService
RUN chmod -R ug+rwx /FrinexBuildService
WORKDIR /FrinexBuildService
RUN ssh-keygen -A
RUN echo -e "PasswordAuthentication no" >> /etc/ssh/sshd_config
RUN echo -e "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
RUN mkdir /home/frinex/.ssh
COPY .ssh/id_ed25519_frinex_synchronisation_service /home/frinex/.ssh/id_ed25519
COPY .ssh/id_ed25519_frinex_synchronisation_service.pub /home/frinex/.ssh/id_ed25519.pub
RUN cat /home/frinex/.ssh/id_ed25519.pub > /home/frinex/.ssh/authorized_keys
RUN cat /home/frinex/.ssh/id_ed25519.pub  >> /home/frinex/.ssh/known_hosts
RUN chown -R frinex:nogroup /home/frinex/.ssh
RUN chmod 600 /home/frinex/.ssh/*
RUN chmod 700 /home/frinex/.ssh
RUN chmod 644 /home/frinex/.ssh/*.pub
RUN chmod 644 /home/frinex/.ssh/authorized_keys
USER frinex
ENTRYPOINT ["/FrinexBuildService/startup.sh"]