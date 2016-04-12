" Initiate plug
if !filereadable(expand("~/.vim/autoload/plug.vim"))
  silent !echo "Setting up vim-plug."
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.github.com/junegunn/vim-plug/master/plug.vim
  silent !echo "Curl plug.vim into autoload"
endif

" Load plug
call plug#begin('~/.vim/bundle')

" Navigation
Plug 'juanibiapina/nerdtree', { 'branch': 'disable-cascade' }
Plug 'mileszs/ack.vim'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'iurifq/ctrlp-rails.vim'
Plug 'majutsushi/tagbar'
Plug 'tpope/vim-unimpaired'

" Git
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'

" Utilities
Plug 'scrooloose/syntastic'
Plug 'tpope/vim-surround'
Plug 'benmills/vimux'
Plug 'jgdavey/vim-turbux'
Plug 'editorconfig/editorconfig-vim'
Plug 'tpope/vim-repeat'
Plug 'terryma/vim-multiple-cursors'
Plug 'godlygeek/tabular'
Plug 'wellle/targets.vim'
Plug 'tpope/vim-eunuch'
Plug 'tpope/vim-abolish'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-rhubarb'
Plug 'tpope/vim-capslock'
Plug 'AndrewRadev/splitjoin.vim'

" Colors
Plug 'altercation/vim-colors-solarized'

" Languages
Plug 'sheerun/vim-polyglot'
Plug 'groovy.vim'
Plug 'AndrewRadev/vim-eco'
Plug 'juanibiapina/bats.vim'
Plug 'wlangstroth/vim-racket'
Plug 'fatih/vim-go'
Plug 'tpope/vim-fireplace'
Plug 'tpope/vim-cucumber'
Plug 'plasticboy/vim-markdown'
Plug 'lambdatoast/elm.vim'

" Ruby
Plug 'ngmy/vim-rubocop'
Plug 'tpope/vim-bundler'

" Rails
Plug 'tpope/vim-rails'

" vim-snipmate
Plug 'MarcWeber/vim-addon-mw-utils'
Plug 'tomtom/tlib_vim'
Plug 'garbas/vim-snipmate'
Plug 'juanibiapina/vim-snippets'

call plug#end()
