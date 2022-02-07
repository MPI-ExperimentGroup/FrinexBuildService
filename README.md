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

# CGI Scripts
/cgi/experiment_access.cgi
    Extracts and displays the information required to access a given experiment.

/cgi/frinex_locations.cgi
/cgi/frinex_upstreams.cgi
    Provides a JSON file of experiments and port numbers for services running in the Docker swarm.

/cgi/repository_setup.cgi
    Creates a GIT repository for the currently authenticated user to be used in the Frinex build process.
