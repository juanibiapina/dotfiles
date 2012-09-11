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
