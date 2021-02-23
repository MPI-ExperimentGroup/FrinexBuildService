# clone the test repository
rm -rf test_co_directory
mkdir test_co_directory
cd test_co_directory
git clone http://localhost:9070/git/TEST_REPOSITORY.git/
if [ -d TEST_REPOSITORY ]; then 
    cd TEST_REPOSITORY
    # do a commit and push
    #cp ~/Documents/Frinex/experiments/with_stimulus_example.xml .
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #echo "bla" >> test_data.txt; git commit -m "modified text file" test_data.txt; git pull; git push --verbose
    #cp -r ~/Documents/Frinex/experiments/with_stimulus_example .
    #git add with_stimulus_example; git commit -m "Adding with_stimulus_example files" with_stimulus_example; git push
    #sed -i ".tmp" "s|state=\"production\"|state=\"undeploy\"|g" with_stimulus_example.xml
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #cp ~/Documents/Frinex/experiments/with_stimulus_example.xml .
    #echo " " >> with_stimulus_example.xml
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #cp ~/Documents/Frinex/experiments/*.json .
    #git add *.json; git commit -m "Adding JSON files" *.json; git push
    #cp ~/Documents/Frinex/*/s*.xml .
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #cp ~/Documents/Frinex/*/*.xml .
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #sed -i ".tmp" "s|textFontSize=\"17\">|textFontSize=\"17\"><deployment publishDate=\"2020-02-02\" expiryDate=\"2025-02-22\" isWebApp=\"true\" isDesktop=\"true\" isiOS=\"true\" isAndroid=\"true\" state=\"staging\" />|g" *.xml
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #sed -i ".tmp" "s|<validationService>|<deployment publishDate=\"2020-02-02\" expiryDate=\"2025-02-22\" isWebApp=\"true\" isDesktop=\"true\" isiOS=\"true\" isAndroid=\"true\" state=\"staging\" /><validationService>|g" *.xml
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
    #sed -i ".tmp" "s|textFontSize=\"17\" >|textFontSize=\"17\"><deployment publishDate=\"2020-02-02\" expiryDate=\"2025-02-22\" isWebApp=\"true\" isDesktop=\"true\" isiOS=\"true\" isAndroid=\"true\" state=\"staging\" />|g" *.xml
    #git add *.xml; git commit -m "Adding XML files" *.xml; git push
else
    echo "failed to clone"
fi