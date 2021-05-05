#!/bin/bash

if [ -z $1 ]
then
  echo "no iso path given"
  exit 1
fi

src=$(realpath $1)

segm1=$(basename $(dirname $src))
segm2=$(basename $src)

mkdir -p ~/mnt/iso/$segm1/$segm2
sudo mount -o loop $1 ~/mnt/iso/$segm1/$segm2

ls -d ~/mnt/iso/$segm1/$segm2
# https://2buntu.com/articles/1436/mounting-bin-and-iso-files-in-linux/
