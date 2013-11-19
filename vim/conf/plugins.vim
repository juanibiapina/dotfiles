" Install vundle
let isVundleInstalled=1
let vundle_readme=expand('~/.vim/bundle/vundle/README.md')
if !filereadable(vundle_readme)
    echo "Installing Vundle.."
    echo ""
    silent !mkdir -p ~/.vim/bundle
    silent !git clone https://github.com/gmarik/vundle ~/.vim/bundle/vundle
    let isVundleInstalled=0
endif

" Load vundle
set rtp+=~/.vim/bundle/vundle/
call vundle#rc()

" plugins
Bundle 'gmarik/vundle'
Bundle 'L9'
Bundle 'FuzzyFinder'
Bundle 'scrooloose/nerdtree'
Bundle 'VimClojure'
Bundle 'scrooloose/syntastic'
Bundle 'tpope/vim-fugitive'
Bundle 'rodjek/vim-puppet'
Bundle 'klen/python-mode'
Bundle 'vim-ruby/vim-ruby'
Bundle 'tpope/vim-rails'
Bundle 'git://vim-latex.git.sourceforge.net/gitroot/vim-latex/vim-latex'
Bundle 'altercation/vim-colors-solarized'
Bundle 'Townk/vim-autoclose'
Bundle 'mileszs/ack.vim'
Bundle 'airblade/vim-gitgutter'
Bundle 'groovy.vim'
Bundle 'kchmck/vim-coffee-script'
Bundle 'AndrewRadev/vim-eco'
Bundle 'tpope/vim-surround'

Bundle 'hail2u/vim-css3-syntax'
Bundle 'groenewege/vim-less'
Bundle "pangloss/vim-javascript"

Bundle 'bufexplorer.zip'

" vim-snipmate
Bundle "MarcWeber/vim-addon-mw-utils"
Bundle "tomtom/tlib_vim"
Bundle "garbas/vim-snipmate"
Bundle "honza/vim-snippets"

Bundle 'slim-template/vim-slim'
Bundle 'digitaltoad/vim-jade'

Bundle "drewfradette/Conque-Shell"

" Configure vundle modules
if isVundleInstalled == 0
    echo "Installing Bundles"
    echo ""
    :BundleInstall
endif
