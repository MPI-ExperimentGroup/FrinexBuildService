# start the web server to host the build listing pages
#httpd
# clean up previous testing data
rm -r /FrinexBuildService/incoming/*
rm -r /FrinexBuildService/processing/*
rm -r /FrinexBuildService/target/*
# create a test repository
bash /FrinexBuildService/create_frinex_build_repository.sh TEST_REPOSITORY
# show any output in the termimal
sed -i "s|>>|#>>|g" /FrinexBuildService/git-repositories/TEST_REPOSITORY.git/hooks/post-receive
cd /FrinexBuildService/git-checkedout/TEST_REPOSITORY
# add some data to it and push
echo "test" > test_data.txt
git add test_data.txt
git commit -m "test" test_data.txt; git push
# do a commit on the test data and push
echo " " >> test_data.txt
git commit -m "test" test_data.txt; git push
# redirect any subsequent output back to the logs
sed -i "s|#>>|>>|g" /FrinexBuildService/git-repositories/TEST_REPOSITORY.git/hooks/post-receive
# make sure any new files are accessable by httpd
# wait for the build container to finish
sleep 1
while [ "$(pidof node-default)" ]
do
  echo "build in process, waiting";
  sleep 1
done
while [ "$(pidof node)" ]
do
  echo "build in process, waiting";
  sleep 1
done
chown -R daemon /FrinexBuildService/git-repositories/TEST_REPOSITORY.git
chown -R daemon /FrinexBuildService/git-checkedout/TEST_REPOSITORY
chown -R daemon /FrinexBuildService/target
chown -R daemon /FrinexBuildService/incoming
# on restart of the machine this might have lost this permission
#chown daemon /var/run/docker.sock