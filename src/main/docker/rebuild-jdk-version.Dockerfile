FROM frinexapps-jdk:alpha
ARG lastCommitDate

# checkout the required commit by date
RUN cd /ExperimentTemplate/; git reset --hard `git rev-list -n 1 --before="$lastCommitDate" master`

RUN cd /ExperimentTemplate/; git status

RUN cd /ExperimentTemplate/; git log --pretty=oneline gwt-cordova | wc -l

RUN sed -i 's|<versionCheck.allowSnapshots>true</versionCheck.allowSnapshots>|<versionCheck.allowSnapshots>false</versionCheck.allowSnapshots>|g' /ExperimentTemplate/pom.xml
RUN sed -i 's|<versionCheck.buildType>testing</versionCheck.buildType>|<versionCheck.buildType>stable</versionCheck.buildType>|g' /ExperimentTemplate/pom.xml

RUN cd /ExperimentTemplate \
    && sed -i '/war/{n;s/-testing-SNAPSHOT/.'$(git log --pretty=oneline gwt-cordova | wc -l)'-stable/}' gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/Frinex Experiment Designer/{n;s/-testing-SNAPSHOT/.'$(git log --pretty=oneline ExperimentDesigner | wc -l)'-stable/}' /ExperimentTemplate/ExperimentDesigner/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-admin/{n;s/-testing-SNAPSHOT/.'$(git log --pretty=oneline registration | wc -l)'-stable/}' /ExperimentTemplate/registration/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/common/{n;s/-testing-SNAPSHOT/.'$(git log --pretty=oneline common | wc -l)'-stable/}' /ExperimentTemplate/common/pom.xml /ExperimentTemplate/registration/pom.xml /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-experiment-designer/{n;s/-testing-SNAPSHOT/.'$(git log --pretty=oneline ExperimentDesigner | wc -l)'-stable/}' /ExperimentTemplate/gwt-cordova/pom.xml
RUN cd /ExperimentTemplate \
    && sed -i '/frinex-parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git log --pretty=oneline | wc -l) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml \
    && sed -i '/Frinex Parent/{n;s/-testing-SNAPSHOT/.'$(expr $(git log --pretty=oneline | wc -l) - 1)'-stable/}' /ExperimentTemplate/pom.xml /ExperimentTemplate/*/pom.xml

RUN cd /ExperimentTemplate \
    && mvn clean install -Dgwt.validateOnly -DskipTests=true -Dmaven.javadoc.skip=true -B -V
RUN cd /ExperimentTemplate \
    && mvn clean install -Dgwt.draftCompile=true -Djdk.xml.xpathExprGrpLimit=140 -Djdk.xml.xpathExprOpLimit=650 -Djdk.xml.xpathTotalOpLimit=150 -DskipTests=true -Dgwt.collapse-all-properties=true -Dexperiment.configuration.name=alloptions
RUN cd /ExperimentTemplate/gwt-cordova \
    && mvn -q -Dexec.executable="echo" -Dexec.args='${project.version}' --non-recursive exec:exec > /ExperimentTemplate/gwt-cordova.version

RUN cd /ExperimentTemplate/ \
    && mvn clean

# clean out the static directory to prevent these files being used in the automated builds
RUN rm -r /ExperimentTemplate/gwt-cordova/src/main/static/*
RUN rm -r ~/.m2
RUN rm -r /test_data_*/*

WORKDIR /target
