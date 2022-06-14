# FrinexBuildService

This Frinex build service manages the necessary docker images and resouces required to build experiment definitions with the ExperimentTemplate.
Experiment configurations are committed to GIT repositories in XML and JSON format along with the required stimuli files which triggers the build process.
When each build stage completes the compiled applications are deployed to the respective staging and production servers.

# Build Listing Page

 localhost /index.html

# Monitoring

Tailing the httpd start up logs and access logs can be done with
docker logs -f frinexbuild

Listing the running containers to verify that the frinexbuild container is running can be done with
docker container ls

# Overview  UML diagram of the server configuration

localhost /docs/DockerSwarmOverview.svg
localhost /docs/ServiceOverview.svg

# Docker Socket
In order for the Frinex build container to start build containers and for the frinex_listing_provider to list services they need to have access to the docker socket normally /var/run/docker.sock. 
The start command for these containers does this with: --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock

If however this causes issues, such as /var/run/docker.sock becoming a directory, it can usually be solved by attaching the directory /var/docker_frinex_build containing the socket as a volume to the build container. The directory containing the docker socket is used as the attached volume rather than the socket iself to prevent a race condition where the build container attempts to mount the socket before it is created on start up (which results in a directory being created where the socket should be).
If this is needed the custom socket location is set in the docker start up command:
DOCKER_OPTS="-H unix:///var/run/docker.sock -H unix:///var/docker_frinex_build/docker.sock"
In which case the containers also need to be modified to use -e DOCKER_HOST="unix:///var/docker_frinex_build/docker.sock" -v /var/docker_frinex_build:/var/docker_frinex_build instead of --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock

# Maintenance Scripts

clean_frinex_docker.sh
    deletes non mandatory volumes, cache and images

start_frinexbuild_container.sh
    Starts the Frinex build service container, if the build service is running it will be terminated first.

terminate_swarm_experiments.sh
    Terminates all running experiment instances running in the Docker swarm.

# Image Maintenance Scripts

generate_latest_frinexapps.sh
    Generates the image used to compile Frinex experiemnts and tags the image as "latest".
    Extracts the latest XSD and documentation files that will be served by HTTPD in the frinexbuild container.

install_frinexbuild_container.sh
    Sets up the requirements of the build server such as the frinex_db_manager and its network.
    Generates the build server image and tags the image as "latest".
    Runs the build server image and sets it to auto start.

test_stable_candidate.sh
promote_latest_to_beta.sh
promote_beta_to_stable.sh

# Backup Scripts

backup_buildserver_images_and_volumes.sh

restore_frinexbuild_backup.sh

# Database Server Setup
The build system uses the frinex_db_manager container to generate databases for new experiments.
There are two postgres instances running on different ports and each requires its own admin user
The required admin user for the staging instance can be created with:
CREATE ROLE db_manager_frinex_staging WITH LOGIN CREATEDB CREATEROLE PASSWORD 'changethis';
The required admin user for the production instance can be created with:
CREATE ROLE db_manager_frinex_production WITH LOGIN CREATEDB CREATEROLE PASSWORD 'changethis';

# CGI Scripts
/cgi/experiment_access.cgi
    Extracts and displays the information required to access a given experiment.

/cgi/frinex_staging_locations.cgi
/cgi/frinex_staging_upstreams.cgi
/cgi/frinex_production_locations.cgi
/cgi/frinex_production_upstreams.cgi
    Provides a JSON file of experiments and port numbers for services running in the Docker swarm.

/cgi/repository_setup.cgi
    Creates a GIT repository for the currently authenticated user to be used in the Frinex build process.
