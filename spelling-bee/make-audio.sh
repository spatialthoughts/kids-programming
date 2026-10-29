#!/bin/bash
# ============================================================
# SPELLING BEE - make-audio.sh
#
# Makes one audio file for every word in words-data.js, using
# the voice built into a Mac (the "say" command).
#
# Added new words? Run this again on a Mac from this folder:
#   bash make-audio.sh
#
# Each file goes in the audio folder, named after the word in
# small letters with spaces turned into dashes. For example,
# "Carbon dioxide" becomes audio/carbon-dioxide.m4a
# ============================================================

# The voice to use, and how fast it talks (words per minute).
VOICE="Daniel"
SPEED=150

mkdir -p audio

# Find every line in words-data.js that looks like:   'Word',
# then take out the quotes and comma to get just the word.
grep -E "^[[:space:]]*'.+',[[:space:]]*$" words-data.js | sed -E "s/^[[:space:]]*'(.+)',[[:space:]]*$/\1/" | while read -r word; do
  file=$(echo "$word" | tr 'A-Z ' 'a-z-')
  say -v "$VOICE" -r "$SPEED" -o "audio/$file.m4a" --file-format=m4af --data-format=aac "$word"
  echo "Made audio/$file.m4a"
done
