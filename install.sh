#!/bin/sh

echo "super simple automagic setup..."



cd $HOME

# Clone if needed
#
if [ ! -d .my_linux/.git ]
then
    git clone git://github.com/dynnamitt/my_linux.git .my_linux
else
    echo ".my_linux clone skipped."
fi

# ZSH
if [ ! -d .oh-my-zsh/.git ]
then
    git clone git://github.com/robbyrussell/oh-my-zsh.git .oh-my-zsh
    cp .oh-my-zsh/templates/zshrc.zsh-template .zshrc
else
    echo ".oh-my-zsh clone skipped."
fi

# VIM pointer
#
rm -f $HOME/.vimrc && ln -s $HOME/.my_linux/vimrc $HOME/.vimrc 

# SHELL hookup
if grep -c .my_linux/sh-init.d $HOME/.zshrc 
then
    echo "sh hooks in place."
else
    #make hooks
    cat << __STOP__ >> $HOME/.zshrc
for file in \$HOME/.my_linux/sh-init.d/*
do
    source \$file
done
__STOP__
fi
