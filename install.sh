#!/bin/sh

alias echo='echo -e'
echo "\n ▪ super simple automagic setup... \n"

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
    current_sh=`grep $USERNAME /etc/passwd | awk 'BEGIN { FS = ":" } ; { print $7 }'`
    zsh_avail=`chsh -l | grep zsh | head -n1`
    if [ -z $zsh_avail ];then 
        echo "zsh is not installed !!!"
        return 1
    elif [ $current_sh = $zsh_avail ];then
        echo current shell is $current_sh
    else
        chsh -s $zsh_avail
    fi
}

function fix_fonts {
    font_src=~/sync1/fonts/**/*?tf
    if [ -f $font_src ]
    then
        echo "installing fonts.. "
        sudo mkdir -p /usr/share/fonts/truetype/myfonts
        sudo cp -v $font_src /usr/share/fonts/truetype/myfonts
        sudo fc-cache
    else 
        echo "skipping copying of files: $font_src."
    fi
}

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
            

# ---------------------------------
#
#                main
#
# ---------------------------------
fix_me
fix_zsh
fix_fonts
vim_pathogen
vim_plugin git://github.com/tpope/vim-sensible.git vim-sensible
vim_plugin git://github.com/altercation/vim-colors-solarized.git vim-colors-solarized
vim_plugin git://github.com/tpope/vim-unimpaired.git vim-unimpaired
vim_plugin git://github.com/tpope/vim-repeat.git vim-repeat
vim_plugin git://github.com/tpope/vim-surround.git vim-surround
vim_plugin https://github.com/Shutnik/jshint2.vim.git jshint2.vim
vim_plugin http://web-indent.googlecode.com/svn/trunk/ web-indent svn

# symlinking
rm -f ~/.vimrc && ln -s ~/.my_linux/vimrc ~/.vimrc 
rm -f ~/.Xresources && ln -s ~/.my_linux/Xresources ~/.Xresources
rm -f ~/.Xdefaults && ln -s ~/.my_linux/Xresources ~/.Xdefaults
rm -f ~/.xinitrc && ln -s ~/.my_linux/xinitrc ~/.xinitrc
rm -f ~/.xbindkeyrc && ln -s ~/.my_linux/xbindkeyrc ~/.xbindkeyrc

# SHELL hookup
if grep -c .my_linux/sh-init.d ~/.zshrc 
then
    echo "my sh-init.d hooks hooked up!"
else
    #make hooks
    cat << __STOP__ >> ~/.zshrc
for file in \~/.my_linux/sh-init.d/*
do
    source \$file
done
__STOP__
fi

# SUDO section for DWM exec script
echo "Copying dwm-starter script... "
sudo cp ~/.my_linux/dwm-starter /usr/local/bin/dwm-starter
