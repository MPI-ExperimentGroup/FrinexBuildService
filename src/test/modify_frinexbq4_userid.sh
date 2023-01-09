#!/bin/bash

# this script updates the userId in all tables used by IDLaS-NL to remove whitespace that was inserted via the IDLaS-NL PHP registration web application

for experimentName in mpiquestionsdemographic mpidigitspan mpicorsi;
do 
    for tableName in audio_data tag_data tag_pair_data screen_data stimulus_response time_stamp audio_data participant; # group_data
    do
        echo $experimentName $tableName
        psql -p5432 -U "frinex_"${experimentName}"_user" -d "frinex_"${experimentName}"_db" -t -c "select count(id) from $tableName where user_id = 'uuid-Fabi 1'";
        #psql -p5432 -U "frinex_"${experimentName}"_user" -d "frinex_"${experimentName}"_db" -t -c "update $tableName set user_id = 'uuid-Fabi_1' where user_id = 'uuid-Fabi 1'";
    done
    echo $experimentName uuid
    psql -p5432 -U "frinex_"${experimentName}"_user" -d "frinex_"${experimentName}"_db" -t -c "select count(id) from participant where uuid = 'Fabi 1'";
    #psql -p5432 -U "frinex_"${experimentName}"_user" -d "frinex_"${experimentName}"_db" -t -c "update participant set uuid = 'Fabi_1' where uuid = 'Fabi 1'";
done
