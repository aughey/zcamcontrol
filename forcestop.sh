#!/bin/sh

for pin in 13 17 26 22; do
  gpio -g mode $pin out
  gpio -g write $pin 0
done
