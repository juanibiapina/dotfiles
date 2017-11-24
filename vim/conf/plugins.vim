" Initiate plug
if !filereadable(expand("~/.vim/autoload/plug.vim"))
  silent !echo "Setting up vim-plug."
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.github.com/junegunn/vim-plug/master/plug.vim
  silent !echo "Curl plug.vim into autoload"
endif

" Load plug
call plug#begin('~/.vim/bundle')

" Navigation
Plug 'juanibiapina/vim-lighttree'
Plug 'mileszs/ack.vim'
Plug 'majutsushi/tagbar'
Plug 'tpope/vim-unimpaired'

Plug 'junegunn/fzf'
Plug 'junegunn/fzf.vim'

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
Plug 'tpope/vim-dispatch'
Plug 'radenling/vim-dispatch-neovim'
Plug 'AndrewRadev/splitjoin.vim'
Plug 'kopischke/vim-fetch'
Plug 'ntpeters/vim-better-whitespace'
Plug 'AndrewRadev/sideways.vim'

" Writing
Plug 'junegunn/goyo.vim'
Plug 'beloglazov/vim-online-thesaurus'

" Colors
Plug 'lifepillar/vim-solarized8'

" vim-snipmate
Plug 'MarcWeber/vim-addon-mw-utils'
Plug 'tomtom/tlib_vim'
Plug 'garbas/vim-snipmate'
Plug 'juanibiapina/vim-snippets'

" Bats
Plug 'juanibiapina/bats.vim'

" Clojure
Plug 'tpope/vim-fireplace'

Plug 'kchmck/vim-coffee-script'

" CSS
Plug 'hail2u/vim-css3-syntax'
Plug 'cakebaker/scss-syntax.vim'

" Cucumber
Plug 'tpope/vim-cucumber'

" Elm
Plug 'elmcast/elm-vim'

" Git
Plug 'tpope/vim-git'
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'

" Go
Plug 'fatih/vim-go'

" HTML
Plug 'othree/html5.vim'

" Javascript
Plug 'pangloss/vim-javascript'
Plug 'mxw/vim-jsx'

" Python
Plug 'aliev/vim-python'
Plug 'mitsuhiko/vim-python-combined'

" Racket
Plug 'wlangstroth/vim-racket'

" Rails
Plug 'tpope/vim-rails'

" Ruby
Plug 'vim-ruby/vim-ruby'
Plug 'ngmy/vim-rubocop'
Plug 'tpope/vim-bundler'
Plug 'keith/rspec.vim'

" Rust
Plug 'rust-lang/rust.vim'

" Terraform
Plug 'hashivim/vim-terraform'

" Toml
Plug 'cespare/vim-toml'

" Vim
Plug 'tmux-plugins/vim-tmux-focus-events'

" Yaml
Plug 'stephpy/vim-yaml'

call plug#end()
