#!/usr/bin/env bash

set -e

echo "Downloading vim-plug"
curl -sfLo ~/.config/nvim/autoload/plug.vim --create-dirs \
     https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

echo "Installing vim plugins"
n=1
until [ $n -ge 6 ]
do
  echo "Attempt #${n}"
  nvim -es -i NONE -u ~/.config/nvim/init.vim +PlugInstall +PlugUpdate +qa && break
  n=$[$n+1]
done

echo "DONE"
