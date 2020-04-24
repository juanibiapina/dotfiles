#!/usr/bin/env bash

set -e

ansible-playbook -i "localhost," --connection=local assets/playbooks/arch-maintenance.yml
