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

RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker system prune -f' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker image ls' >> /etc/sudoers
RUN echo 'frinex ALL=(ALL) NOPASSWD: /usr/bin/docker service ls --format {{.Name}}' >> /etc/sudoers

RUN adduser -S frinex
RUN chown -R frinex /FrinexBuildService
RUN chmod -R ug+rwx /FrinexBuildService
WORKDIR /FrinexBuildService
USER frinex
ENTRYPOINT ["/FrinexBuildService/frinex_synchronisation_service.sh"]
