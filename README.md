# FrinexBuildService

This Frinex build service manages the necessary docker images and resouces required to build experiment definitions with the ExperimentTemplate.
Experiment configurations are committed to GIT repositories in XML and JSON format along with the required stimuli files which triggers the build process.
When each build stage completes the compiled applications are deployed to the respective staging and production servers.

# Overview  UML diagram of the server configuration

<localhost>/docs/DockerSwarmOverview.svg
<localhost>/docs/ServiceOverview.svg

# Maintenance Scripts

clean_frinex_docker.sh
    deletes non mandatory files and images

start_frinexbuild_container.sh
    Starts the Frinex build service image, if the build service is running it will be terminated first.

# Image Maintenance Scripts
generate_latest_frinexapps.sh
install_frinexbuild_container.sh
test_stable_candidate.sh
promote_latest_to_beta.sh 

# Backup Scripts
restore_frinexbuild_backup.sh
