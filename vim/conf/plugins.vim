" Initiate plug
if !filereadable(expand("~/.vim/autoload/plug.vim"))
  silent !echo "Setting up vim-plug."
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.github.com/junegunn/vim-plug/master/plug.vim
  silent !echo "Curl plug.vim into autoload"
endif

" Load plug
call plug#begin('~/.vim/bundle')

" Navigation
Plug 'juanibiapina/vim-lighttree', { 'dir': '~/development/vim-lighttree' }
Plug 'mileszs/ack.vim'
Plug 'tpope/vim-unimpaired'

Plug 'junegunn/fzf'
Plug 'junegunn/fzf.vim'

" Utilities
Plug 'dense-analysis/ale'
Plug 'tpope/vim-surround'
Plug 'editorconfig/editorconfig-vim'
Plug 'tpope/vim-repeat'
Plug 'terryma/vim-multiple-cursors'
Plug 'godlygeek/tabular'
Plug 'wellle/targets.vim'
Plug 'tpope/vim-eunuch'
Plug 'tpope/vim-abolish'
Plug 'tpope/vim-rhubarb'
Plug 'tpope/vim-capslock'
Plug 'tpope/vim-dispatch'
Plug 'radenling/vim-dispatch-neovim'
Plug 'AndrewRadev/splitjoin.vim'
Plug 'kopischke/vim-fetch'
Plug 'ntpeters/vim-better-whitespace'
Plug 'AndrewRadev/sideways.vim'
Plug 'moll/vim-bbye'
Plug 'sunaku/vim-shortcut'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-sensible'
Plug 'kassio/neoterm'

" Bats
Plug 'juanibiapina/bats.vim'

" Colors
Plug 'lifepillar/vim-solarized8'

" Clojure
Plug 'tpope/vim-fireplace'

" Coffeescript
Plug 'kchmck/vim-coffee-script'

" CSS
Plug 'hail2u/vim-css3-syntax'
Plug 'cakebaker/scss-syntax.vim'

" Cucumber
Plug 'tpope/vim-cucumber'

" Devdocs
Plug 'romainl/vim-devdocs'

" Diff
Plug 'lambdalisue/vim-improve-diff'
Plug 'lambdalisue/vim-unified-diff'

" Docker
Plug 'ekalinin/Dockerfile.vim'

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

" Language Server Protocol
Plug 'prabirshrestha/async.vim'
Plug 'prabirshrestha/vim-lsp'

" Lua
Plug 'tbastos/vim-lua'

" Organization
Plug 'juanibiapina/vim-gorg', { 'dir': '~/development/vim-gorg' }

" Python
Plug 'aliev/vim-python'
Plug 'mitsuhiko/vim-python-combined'

" Quickfix
Plug 'itchyny/vim-qfedit'

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

" Snippets
Plug 'MarcWeber/vim-addon-mw-utils'
Plug 'tomtom/tlib_vim'
Plug 'garbas/vim-snipmate'

" Terraform
Plug 'hashivim/vim-terraform'

" Testing
Plug 'juanibiapina/vim-runner', { 'dir': '~/development/vim-runner' }

" Tmux
Plug 'tmux-plugins/vim-tmux-focus-events'

" Toml
Plug 'cespare/vim-toml'

" Typescript
Plug 'leafgarland/typescript-vim'

" Workflow
Plug 'juanibiapina/vim-later', { 'dir': '~/development/vim-later' }

" Writing
Plug 'junegunn/goyo.vim'
Plug 'beloglazov/vim-online-thesaurus'

" Yaml
Plug 'stephpy/vim-yaml'

call plug#end()

" Required to call Shortcut command during initialization
runtime plugin/shortcut.vim
