" Install vundle
let isVundleInstalled=1
let vundle_readme=expand('~/.vim/bundle/Vundle.vim/README.md')
if !filereadable(vundle_readme)
    echo "Installing Vundle.."
    echo ""
    silent !mkdir -p ~/.vim/bundle
    silent !git clone https://github.com/gmarik/Vundle.vim ~/.vim/bundle/Vundle.vim
    let isVundleInstalled=0
endif

" Load vundle
set rtp+=~/.vim/bundle/Vundle.vim/
call vundle#begin()

" plugins
Plugin 'gmarik/Vundle.vim'
Plugin 'scrooloose/nerdtree'
Plugin 'scrooloose/syntastic'
Plugin 'tpope/vim-fugitive'
Plugin 'tpope/vim-rails'
Plugin 'mileszs/ack.vim'
Plugin 'airblade/vim-gitgutter'
Plugin 'tpope/vim-surround'
Plugin 'tpope/vim-bundler'
Plugin 'tpope/vim-git'

Plugin 'kien/ctrlp.vim'
Plugin 'iurifq/ctrlp-rails.vim'

" Colors
Plugin 'altercation/vim-colors-solarized'

" Languages
Plugin 'slim-template/vim-slim'
Plugin 'digitaltoad/vim-jade'
Plugin 'hail2u/vim-css3-syntax'
Plugin 'groenewege/vim-less'
Plugin 'pangloss/vim-javascript'
Plugin 'VimClojure'
Plugin 'vim-ruby/vim-ruby'
Plugin 'git://vim-latex.git.sourceforge.net/gitroot/vim-latex/vim-latex'
Plugin 'rodjek/vim-puppet'
Plugin 'groovy.vim'
Plugin 'klen/python-mode'
Plugin 'kchmck/vim-coffee-script'
Plugin 'AndrewRadev/vim-eco'
Plugin 'juanibiapina/bats.vim'

" vim-snipmate
Plugin 'MarcWeber/vim-addon-mw-utils'
Plugin 'tomtom/tlib_vim'
Plugin 'garbas/vim-snipmate'
Plugin 'honza/vim-snippets'

call vundle#end()

" Configure vundle modules
if isVundleInstalled == 0
    echo "Installing Plugins"
    echo ""
    :PluginInstall
endif
