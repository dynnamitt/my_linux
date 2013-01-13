#!/bin/bash
cd $HOME
if [ ! -d .my_linux/.git ]
then
    git clone git://github.com/dynnamitt/my_linux.git .my_linux
    cd .my_linux/
fi


