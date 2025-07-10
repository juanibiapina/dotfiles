#!/usr/bin/env bash

set -e

echo "Installing vim plugins"
n=1
until [ $n -ge 6 ]
do
  echo "Attempt #${n}"
  nvim-plug-install && break
  n=$[$n+1]
done

echo "DONE"
