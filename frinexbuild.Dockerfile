FROM httpd:2.4-alpine
RUN apk add --no-cache \
  git \
  npm
RUN git config --global user.name "Frinex Build Service"
Run git config --global user.email "noone@frinexbuild.mpi.nl"
RUN mkdir /FrinexBuildService/
RUN mkdir /FrinexBuildService/git-repositories
RUN mkdir /FrinexBuildService/git-checkedout
RUN mkdir /usr/local/apache2/htdocs/target
COPY ./deploy-by-hook.js /FrinexBuildService/
COPY ./publish.properties /FrinexBuildService/
COPY ./post-receive /FrinexBuildService/post-receive
RUN sed -i "s|TargetDirectory|/usr/local/apache2/htdocs/target|g" /FrinexBuildService/post-receive
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/post-receive
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/post-receive
COPY ./create_frinex_build_repository.sh /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|TargetDirectory|/usr/local/apache2/htdocs/target|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|RepositoriesDirectory|/FrinexBuildService/git-repositories|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sed -i "s|CheckoutDirectory|/FrinexBuildService/git-checkedout|g" /FrinexBuildService/create_frinex_build_repository.sh
RUN sh /FrinexBuildService/create_frinex_build_repository.sh NBL
RUN sh /FrinexBuildService/create_frinex_build_repository.sh POL
RUN sh /FrinexBuildService/create_frinex_build_repository.sh LADD
