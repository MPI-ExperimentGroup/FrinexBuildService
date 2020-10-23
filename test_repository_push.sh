# clone the test repository
rm -rf test_co_directory
mkdir test_co_directory
cd test_co_directory
git clone http://localhost:8081/git/TEST_REPOSITORY.git/
if [ -d TEST_REPOSITORY ]; then 
    cd TEST_REPOSITORY
    # do a commit and push
    echo "bla" >> test_data.txt; git commit -m "modified text file" test_data.txt; git pull; git push --verbose
    cp ~/Documents/Frinex/experiments/*.json .
    git add *.json; git commit -m "Adding JSON files" *.json; git push
else
    echo "failed to clone"
fi