# clone the test repository
rm -rf test_co_directory
mkdir test_co_directory
cd test_co_directory
git clone http://localhost:8070/git/TEST_REPOSITORY.git/
if [ -d TEST_REPOSITORY ]; then 
    cd TEST_REPOSITORY
    # do a commit and push
    echo "bla" >> test_data.txt; git commit -m "modified text file" test_data.txt; git pull; git push --verbose
    cp ~/Documents/Frinex/experiments/*.json .
    git add *.json; git commit -m "Adding JSON files" *.json; git push
    #cp ~/Documents/Frinex/*/s*.xml .
    cp -r ~/Documents/Frinex/experiments/with_stimulus_example .
    git add with_stimulus_example; git commit -m "Adding with_stimulus_example files" with_stimulus_example; git push
    cp ~/Documents/Frinex/experiments/*mple.xml .
    git add *.xml; git commit -m "Adding XML files" *.xml; git push
else
    echo "failed to clone"
fi