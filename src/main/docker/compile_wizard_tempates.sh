#!/bin/bash
#
# Copyright (C) 2022 Max Planck Institute for Psycholinguistics
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
#

#
# @since 10 Jan 2022 11:09 PM (creation date)
# @author Peter Withers <peter.withers@mpi.nl>
#

# this script compiles all found templates and places them in a location where they can be accessed by the wizard

mkdir /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/
mkdir /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/

# make sure we have the dependencies built
cd /ExperimentTemplate/common \
    && mvn clean install -DskipTests=true -Dmaven.javadoc.skip=true
cd /ExperimentTemplate/AdaptiveVocabularyAssessmentModule \
    && mvn clean install -DskipTests=true -Dmaven.javadoc.skip=true

# TODO: start a file listing all of the successfully compiled templates

# TODO: the use of template_example here will be replaced by actual templates
# TODO: loop on find XML files containing "templateInfo" and stuff the contents of the templateInfo element into JSON object for each template
for templatePath in $(grep -l "<templateInfo" /ExperimentTemplate/ExperimentDesigner/src/main/resources/frinex-templates/*.xml /ExperimentTemplate/ExperimentDesigner/src/test/resources/frinex-rest-output/*.xml); do
    # templateFileName=$(basename $templatePath);
    # templateName=${templateFileName/.xml/}
    templateName=$(basename $templatePath .xml);
    templateDirectory=$(dirname $templatePath);
    echo $templatePath
    echo $templateDirectory
    echo $templateName
    # TODO: we might not want draftCompile when this is in production
    cd /ExperimentTemplate/gwt-cordova
        && mvn clean install -DskipTests=true -Dmaven.javadoc.skip=true -Dgwt.draftCompile=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.path=$templateDirectory -Dexperiment.configuration.name=$templateName
    mkdir /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/ExperimentTemplate /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    #cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/opus-recorder /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/groups.js /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/stomp-websocket /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/grouptestframes.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/grouptestpage.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/version.json /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/scss /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/$templateName.xml /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/StyleTestPage.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/index.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/sockjs-client /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/static /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/jquery /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/css /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    cp -r /ExperimentTemplate/gwt-cordova/target/$templateName-frinex-gui-*-testing-SNAPSHOT/TestingFrame.html /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/$templateName/
    ls -l /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/
done
# TODO: append the file listing all of the successfully compiled templates

# TODO: end the file listing all of the successfully compiled templates
# grep -o "<templateInfo" /ExperimentTemplate/ExperimentDesigner/src/main/resources/static/compiled_templates/*.xml