#!/bin/sh

# check gist in github / dynnamitt for latest version

# Make sure you have a PRIVATE_TOKEN in the file ~/.gitlab_token
GL_TOKEN=$(cat ~/.gitlab_token)
[ -z $GL_TOKEN ] && (printf "\n\nno token!\n\n\n";exit 1)

# UID from username ARG1 on command-line
USER_NAME=${1:-kjetil.midtlie}
UID=$(curl "https://gitlab.com/api/v4/users?private_token=$GL_TOKEN&username=$USER_NAME" | jq -r '.[0]|.id')

curl "https://gitlab.com/api/v4/users/$UID/starred_projects?private_token=$GL_TOKEN" \
   | jq -r '.[] | .ssh_url_to_repo + "\t" + .path_with_namespace' \
   | parallel --colsep '\t' git clone {1} {2}
