# create a test repository
bash /FrinexBuildService/create_frinex_build_repository.sh TEST_REPOSITORY
cd /FrinexBuildService/git-checkedout/TEST_REPOSITORY
# add some data to it and push
echo "test" > test_data.txt
git add test_data.txt
git commit -m "test" test_data.txt; git push
# do a commit on the test data and push
echo " " >> test_data.txt
git commit -m "test" test_data.txt; git push