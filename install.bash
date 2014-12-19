#!/bin/bash

echo -e "\n ▪ super simple automagic setup... \n"

# Makes it possible to run via curl <url>|sh
function fix_me {
    # Clone if needed
    #
    if [ ! -d ~/.my_linux/.git ]
    then
        git clone git://github.com/dynnamitt/my_linux.git ~/.my_linux
    else
        echo ".my_linux clone skipped... syncing.."
        (cd ~/.my_linux && git pull)
    fi
}


function fix_zsh {
    # ZSH
    if [ ! -d ~/.oh-my-zsh/.git ]
    then
        git clone git://github.com/robbyrussell/oh-my-zsh.git ~/.oh-my-zsh
        cp ~/.oh-my-zsh/templates/zshrc.zsh-template ~/.zshrc
    else
        echo ".oh-my-zsh clone skipped... syncing.."
        (cd ~/.oh-my-zsh && git pull)
    fi

    USERNAME=$(id -un)



    current_sh=$(grep $USERNAME /etc/passwd |\
        awk 'BEGIN { FS = ":" } ; { print $7 }')

    echo current shell : $current_sh  

    zsh_avail=`cat /etc/shells | grep zsh | head -n1`
    echo availiable zsh is $zsh_avail 

    if [ -z $zsh_avail ];then 
        echo "zsh is not installed !!!"
        return 1
    elif [ $current_sh = $zsh_avail ];then
        echo current shell is $current_sh
    else
        sudo chsh -s $zsh_avail
	echo zsh was set
    fi
}

function fix_fonts {
    if find ~/sync1/fonts/ -iname '*tf' &>/dev/null
    then
        echo "installing fonts.. "
        sudo mkdir -p /usr/share/fonts/truetype/myfonts
        for font in $(find ~/sync1/fonts/ -iname '*tf')
        do
          sudo cp -v $font /usr/share/fonts/truetype/myfonts
        done
        sudo fc-cache
    else 
        echo "skipping copying of donts"
    fi
}

           

# ---------------------------------
#
#                main
#
# ---------------------------------
fix_me
fix_zsh
fix_fonts

# ctags
cp _ctags ~/.ctags

source ~/.my_linux/vim-pimper.bash

# symlinking
# rm -f ~/.Xresources && ln -s ~/.my_linux/Xresources ~/.Xresources
# rm -f ~/.Xdefaults && ln -s ~/.my_linux/Xresources ~/.Xdefaults
# rm -f ~/.xinitrc && ln -s ~/.my_linux/xinitrc ~/.xinitrc
# rm -f ~/.xbindkeyrc && ln -s ~/.my_linux/xbindkeyrc ~/.xbindkeyrc

# SHELL hookup
if grep -c .my_linux/sh-init.d ~/.zshrc 
then
    echo "my sh-init.d hooks hooked up!"
else
    #make hooks
    cat << __STOP__ >> ~/.zshrc
for file in ~/.my_linux/sh-init.d/*
do
    source \$file
done
__STOP__
fi

# SUDO section for DWM exec script
#echo "Copying dwm-starter script... "
#sudo cp ~/.my_linux/dwm-starter /usr/local/bin/dwm-starter
