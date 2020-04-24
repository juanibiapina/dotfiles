#!/usr/bin/env bash

set -e

host="$1"

if [ -z "$host" ]; then
  echo "Missing host"
  exit 1
fi

ssh-copy-id -i ~/.ssh/id_rsa.pub jibiapina@$host

ansible-playbook -i "$host," -e github_access_token="$GITHUB_TOKEN" assets/playbooks/bootstrap-arch.yml
