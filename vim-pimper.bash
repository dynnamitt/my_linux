#!/bin/bash

rm -f ~/.vimrc && ln -s ~/.my_linux/vimrc ~/.vimrc 

function vim_pathogen {
    
    echo "fetching vim-pathogen..."
    mkdir -p ~/.vim/autoload ~/.vim/bundle
    curl -Sso ~/.vim/autoload/pathogen.vim \
        https://raw.github.com/tpope/vim-pathogen/master/autoload/pathogen.vim
}

function vim_plugin {
    
    echo "fetching vim plugin: $1" 
    cvs=${3-git}
    cvs_sync=pull
    cvs_clone=clone
    if [ $cvs = svn ]; then
        cvs_sync=update
        cvs_clone=checkout
    fi

    (
    cd ~/.vim/bundle
    if [ -d $2/.git ] || [ -d $2/.svn ]
    then
        # existing
        cd $2
        $cvs $cvs_sync
    else
        # needs clone !
        $cvs $cvs_clone $1 $2
    fi
    )
}

vim_pathogen

echo 'loading/updating all my plugins ... '
vim_plugin git://github.com/tpope/vim-sensible.git vim-sensible
vim_plugin git://github.com/altercation/vim-colors-solarized.git vim-colors-solarized
vim_plugin https://github.com/scrooloose/nerdtree nerdtree
vim_plugin git://github.com/tpope/vim-unimpaired.git vim-unimpaired
vim_plugin git://github.com/tpope/vim-repeat.git vim-repeat
vim_plugin git://github.com/tpope/vim-surround.git vim-surround
vim_plugin https://github.com/Shutnik/jshint2.vim.git jshint2.vim
vim_plugin https://github.com/kchmck/vim-coffee-script.git

vim_plugin http://web-indent.googlecode.com/svn/trunk/ web-indent svn
