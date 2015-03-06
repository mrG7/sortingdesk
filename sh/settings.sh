# settings.sh.default --- Contains DEFAULT project settings used by Bash scripts.
#
# Copyright (c) 2015 Diffeo
#
# Comments:
# By default, the settings file (`settings.sh´) is a symbolic link to this file.
# This file contains default settings and should *never* be changed. If you wish
# to customise your own settings, please copy this file and name it
# `settings.sh´.
#

# URL of Dossier stack excluding prefixes
#readonly URL_DOSSIER_STACK=http://54.174.195.250:8080
readonly URL_DOSSIER_STACK=http://localhost:8080

# Prefix to append to Dossier Stack URL
# Note: ensure prefix BEGINS with a forward slash but does NOT end with one.
readonly URL_DOSSIER_STACK_PREFIX=/dossier

# URL of local service responsible for reloading the Sorting Desk Firefox
# extension
readonly URL_FIREFOX_RELOAD=http://localhost:8888

# Delay in seconds before the `update-deps´ script is executed when a file is
# created, modified, deleted or moved in within the `src/´ subtree.  This
# applies to the `watch-deps´ script.
readonly DELAY_UPDATE=1

# Full path to yaml file containing the settings for a dossier.models instance.
readonly PATH_DOSSIER_MODELS_YAML=~/dev/diffeo/miguel.yaml