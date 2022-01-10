#!/bin/bash

# this script applies location specific settings in the various configuration files during the docker image build process.

# Frinex Build settings
sed -i "s|UrlLDAP|example.com|g" /FrinexBuildService/frinex-git-server.conf 
sed -i "s|DcLDAP|DC=example,DC=com|g" /FrinexBuildService/frinex-git-server.conf 
sed -i "s|UserLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
sed -i "s|PassLDAP|example|g" /FrinexBuildService/frinex-git-server.conf 
sed -i "s|#LDAPOPTION||g" /FrinexBuildService/frinex-git-server.conf 
#sed -i "s|#PUBLICOPTION||g" /FrinexBuildService/frinex-git-server.conf 

# Frinex Repository settings
sed -i "s|BuildServerUrl|http://example.com|g" /FrinexBuildService/cgi/repository_setup.cgi

# Frinex Wizard settings
sed -i "s|ldaps://ldap.example.com:33389/dc=myco,dc=org|ldap://example.com:389/DC=example,DC=com|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|ou=exampleGroups|ou=example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|exampleAttribute|example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#sed -i "s|uid=admin,ou=system|uid=example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|uid=admin,ou=system|example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|managerDnPassword|example|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#sed -i "s|uid={0},ou=examplePattern|CN={0},CN=Users|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
sed -i "s|uid={0},ou=examplePattern|userPrincipalName={0}|g" /ExperimentTemplate/ExperimentDesigner/src/main/resources/application.properties
#sed -i "s|.anyRequest().authenticated()|.anyRequest().fullyAuthenticated()|g" /ExperimentTemplate/ExperimentDesigner/src/main/java/nl/mpi/tg/eg/experimentdesigner/WebSecurityConfig.java
# this option disables authentication in the wizard: sed -i "s|.anyRequest().authenticated()|.anyRequest().permitAll()|g" /ExperimentTemplate/ExperimentDesigner/src/main/java/nl/mpi/tg/eg/experimentdesigner/WebSecurityConfig.java
