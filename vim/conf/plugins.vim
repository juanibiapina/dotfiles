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
Plugin 'L9'
Plugin 'FuzzyFinder'
Plugin 'scrooloose/nerdtree'
Plugin 'VimClojure'
Plugin 'scrooloose/syntastic'
Plugin 'tpope/vim-fugitive'
Plugin 'rodjek/vim-puppet'
Plugin 'klen/python-mode'
Plugin 'vim-ruby/vim-ruby'
Plugin 'tpope/vim-rails'
Plugin 'git://vim-latex.git.sourceforge.net/gitroot/vim-latex/vim-latex'
Plugin 'altercation/vim-colors-solarized'
Plugin 'Townk/vim-autoclose'
Plugin 'mileszs/ack.vim'
Plugin 'airblade/vim-gitgutter'
Plugin 'groovy.vim'
Plugin 'kchmck/vim-coffee-script'
Plugin 'AndrewRadev/vim-eco'
Plugin 'tpope/vim-surround'
Plugin 'restore_view.vim'
Plugin 'tpope/vim-bundler'
Plugin 'tpope/vim-git'

Plugin 'hail2u/vim-css3-syntax'
Plugin 'groenewege/vim-less'
Plugin 'pangloss/vim-javascript'

Plugin 'bufexplorer.zip'

" vim-snipmate
Plugin 'MarcWeber/vim-addon-mw-utils'
Plugin 'tomtom/tlib_vim'
Plugin 'garbas/vim-snipmate'
Plugin 'honza/vim-snippets'

Plugin 'slim-template/vim-slim'
Plugin 'digitaltoad/vim-jade'

call vundle#end()

" Configure vundle modules
if isVundleInstalled == 0
    echo "Installing Plugins"
    echo ""
    :PluginInstall
endif
