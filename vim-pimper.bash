#!/bin/bash

rm -f ~/.vimrc && ln -s ~/.my_linux/vimrc ~/.vimrc 

function vim_pathogen {
    
    echo "fetching vim-pathogen..."
    mkdir -p ~/.vim/autoload ~/.vim/bundle
    curl -Sso ~/.vim/autoload/pathogen.vim \
        https://raw.githubusercontent.com/tpope/vim-pathogen/master/autoload/pathogen.vim
}

function vim_plugin {

    local url=$1
    local base_no_suffix=$(basename $url | sed -e 's/\.[^\.]*$//') 
    local dirname=${3:-${base_no_suffix}}
   
    echo  --- $dirname ---
    echo "fetching vim plugin: $url" 
    local cvs=${2:-git}
    local cvs_sync=pull
    local cvs_clone=clone
    
    if [ $cvs = svn ]; then
        cvs_sync=update
        cvs_clone=checkout
    fi

    (
    cd ~/.vim/bundle
    if [ -d $dirname/.git ] || [ -d $dirname/.svn ]
    then
        # existing
        (
        cd $dirname
        $cvs $cvs_sync
        )
    else
        # needs clone !
        $cvs $cvs_clone $url $dirname
    fi
    )
}

vim_pathogen

echo 'loading/updating all my plugins ... '
vim_plugin git://github.com/tpope/vim-sensible.git 
vim_plugin git://github.com/altercation/vim-colors-solarized.git 
vim_plugin https://github.com/scrooloose/nerdtree 
vim_plugin git://github.com/tpope/vim-unimpaired.git 
vim_plugin git://github.com/tpope/vim-repeat.git 
vim_plugin git://github.com/tpope/vim-surround.git 
vim_plugin git://github.com/tpope/vim-commentary.git
vim_plugin https://github.com/Shutnik/jshint2.vim.git 
vim_plugin https://github.com/kchmck/vim-coffee-script.git
vim_plugin git://github.com/digitaltoad/vim-jade.git
vim_plugin http://web-indent.googlecode.com/svn/trunk/ svn web-indent
vim_plugin https://github.com/wlangstroth/vim-racket
vim_plugin https://github.com/amdt/vim-niji
