#!/bin/bash

# this script applies location specific settings in the various configuration files during the docker image build process.
RUN sed -i "s|UrlLDAP|example.com|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|DcLDAP|DC=example,DC=com|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|UserLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|PassLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
RUN sed -i "s|#LDAPOPTION||g" /FrinexBuildService/frinex-git-server.conf 
#RUN sed -i "s|#PUBLICOPTION||g" /FrinexBuildService/frinex-git-server.conf 

RUN sed -i "s|BuildServerUrl|http://example.com|g" /FrinexBuildService/cgi/repository_setup.cgi

