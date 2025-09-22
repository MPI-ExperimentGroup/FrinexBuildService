war_path=/srv/tomcat/webapps
backup_path=/srv/tomcat/webapps-backup
target_file="WEB-INF/classes/applicaton.properties"
property_string=com.example.property.name
mkdir /srv/tomcat/webapps-backup
for war in $war_path/*-admin.war; do

  if unzip -l "$war" "$target_file" >/dev/null 2>&1; then
    echo "Modifying $target_file in $war..."
    cp -n $war $backup_path/
    randomString=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16)
    echo "\"$war\": \"$randomString\"," >> $backup_path/randomString.log
    # Extract the target file's content
    unzip -p "$war" "$target_file" | \
      sed -i "s/^$property_string=.*/$property_string=$randomString/" > temp_replacement_file

    # Update the file inside the war
    zip -q -d "$war" "$target_file"  # delete the original
    zip -q "$war" temp_replacement_file -j -z <<< ""  # add modified file

    # Place it back with the correct path
    zip -q "$war" -j temp_replacement_file
    zip -q -d "$war" "$(basename temp_replacement_file)"
    zip -q "$war" -j -z <<< "" "$target_file=temp_replacement_file"

    echo "Updated $target_file in $war"
    rm temp_replacement_file
  else
    echo "  $target_file not found in $war, skipping."
  fi
done
