#!/bin/bash

# https://2buntu.com/articles/1436/mounting-bin-and-iso-files-in-linux/

# https://www.linuxquestions.org/questions/linux-newbie-8/how-to-join-two-iso-image-files-in-linux-850859/
#        $  mkisofs -relaxed-filenames -l -o a.iso b.iso

if [ -z $1 ]
then
  echo "no iso path given"
  exit 1
fi

src=$(realpath $1)

segm1=$(basename $(dirname $src))
segm2=${2:-$(basename $src)}

dest=$segm1/$segm2

printf "dest = ~/mnt/iso/$dest, ok? (ctrl+c to exit) "
read x


mkdir -p ~/mnt/iso/$dest

sudo mount -o loop $1 ~/mnt/iso/$dest

ls -d ~/mnt/iso/$dest

