war_path=/srv/tomcat/webapps
backup_path=/srv/webapps-backup
target_file="WEB-INF/classes/application.properties"
property_string=nl.mpi.tg.eg.frinex.admin.password
temp_file=$backup_path/$target_file
sudo mkdir $backup_path
sudo chmod a+w $backup_path
mkdir -p $backup_path/$(dirname "$target_file")
rm $backup_path/randomString.log
for war in $war_path/*-admin.war; do

  if unzip -l "$war" "$target_file" >/dev/null 2>&1; then
    echo "Modifying $target_file in $war..."
    cp -n $war $backup_path/
    randomString=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16)
    echo "\"$war\": \"$randomString\"," >> $backup_path/randomString.log
    # Extract the target file's content
    unzip -p "$war" "$target_file" | \
      sed "s/^$property_string=.*/$property_string=$randomString/" > $temp_file

    cat $temp_file
    # Update the file inside the war
    sudo zip -q -d "$war" "$target_file"  # delete the original
    (cd $backup_path && sudo zip -q "$war" "$target_file")  # add modified file

    rm $temp_file
  else
    echo "  $target_file not found in $war, skipping."
  fi
done
sudo chown tomcat:tomcat /srv/tomcat/webapps/*admin*.war
