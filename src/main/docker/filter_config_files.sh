#!/bin/bash

# this script applies location specific settings in the various configuration files during the docker image build process.

if [ -e /FrinexBuildService/frinex-git-server.conf ]; then
# Frinex Build settings
sed -i "s|UrlLDAP|example.com|g" /FrinexBuildService/frinex-git-server.conf
sed -i "s|DcLDAP|DC=example,DC=com|g" /FrinexBuildService/frinex-git-server.conf
sed -i "s|UserLDAP|example|g" /FrinexBuildService/frinex-git-server.conf
sed -i "s|PassLDAP|example|g" /FrinexBuildService/frinex-git-server.conf
sed -i "s|#LDAPOPTION||g" /FrinexBuildService/frinex-git-server.conf 
#sed -i "s|#PUBLICOPTION||g" /FrinexBuildService/frinex-git-server.conf 
fi

if [ -e /FrinexBuildService/cgi/repository_setup.cgi ]; then
# Frinex Repository settings
sed -i "s|BuildServerUrl|http://example.com|g" /FrinexBuildService/cgi/repository_setup.cgi
fi

if [ -e /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties ]; then
# Frinex Wizard settings
sed -i "s|ldaps://ldap.example.com:33389/dc=myco,dc=org|ldaps://example.com:636/CN=Users,DC=example,DC=com|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|ou=exampleGroups|ou=groups|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|exampleAttribute|passwordAttribute|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#RUN sed -i "s|uid=admin,ou=system|uid=example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|uid=admin,ou=system|example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|managerDnPassword|example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#sed -i "s|uid={0},ou=examplePattern|CN={0},CN=Users|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|uid={0},ou=examplePattern|userPrincipalName={0}|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#sed -i "s|.anyRequest().authenticated()|.anyRequest().fullyAuthenticated()|g" /ExperimentTemplate/ExperimentDesigner/src/main/java/nl/mpi/tg/eg/experimentdesigner/WebSecurityConfig.java
# this option disables authentication in the wizard: sed -i "s|.anyRequest().authenticated()|.anyRequest().permitAll()|g" /ExperimentTemplate/ExperimentDesigner/src/main/java/nl/mpi/tg/eg/experimentdesigner/WebSecurityConfig.java
fi
