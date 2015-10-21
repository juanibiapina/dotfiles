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

" Plugin manager
Plugin 'gmarik/Vundle.vim'

" Navigation
Plugin 'scrooloose/nerdtree'
Plugin 'mileszs/ack.vim'
Plugin 'kien/ctrlp.vim'
Plugin 'iurifq/ctrlp-rails.vim'
Plugin 'majutsushi/tagbar'

" Git
Plugin 'tpope/vim-fugitive'
Plugin 'airblade/vim-gitgutter'

" Utilities
Plugin 'scrooloose/syntastic'
Plugin 'tpope/vim-surround'
Plugin 'benmills/vimux'
Plugin 'jgdavey/vim-turbux'
Plugin 'editorconfig/editorconfig-vim'
Plugin 'tpope/vim-repeat'
Plugin 'terryma/vim-multiple-cursors'
Plugin 'godlygeek/tabular'

" Colors
Plugin 'altercation/vim-colors-solarized'

" Languages
Plugin 'sheerun/vim-polyglot'
Plugin 'groovy.vim'
Plugin 'AndrewRadev/vim-eco'
Plugin 'juanibiapina/bats.vim'
Plugin 'wlangstroth/vim-racket'
Plugin 'fatih/vim-go'
Plugin 'tpope/vim-fireplace'
Plugin 'tpope/vim-cucumber'
Plugin 'plasticboy/vim-markdown'
Plugin 'lambdatoast/elm.vim'

" Ruby
Plugin 'ngmy/vim-rubocop'
Plugin 'tpope/vim-bundler'

" Rails
Plugin 'tpope/vim-rails'

" vim-snipmate
Plugin 'MarcWeber/vim-addon-mw-utils'
Plugin 'tomtom/tlib_vim'
Plugin 'garbas/vim-snipmate'
Plugin 'juanibiapina/vim-snippets'

call vundle#end()

" Configure vundle modules
if isVundleInstalled == 0
    echo "Installing Plugins"
    echo ""
    :PluginInstall
endif
