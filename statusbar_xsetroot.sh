#!/bin/zsh

while true
do
    xsetroot -name "$(date +"%F %R") -:- $(acpi -b|awk 'sub(/,/,"") {print $3, $4, $5, $6}')"
    sleep 1m
done &

