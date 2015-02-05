# settings.sh --- Contains project settings used by Bash scripts.
#
# Copyright (c) 2015 Diffeo
#
# Comments:
#

# URL of Dossier stack excluding prefixes
readonly URL_DOSSIER_STACK=http://54.174.195.250:8080

# Prefix to append to Dossier Stack URL
# Note: ensure prefix BEGINS with a forward slash but does NOT end with one.
readonly URL_DOSSIER_STACK_PREFIX=/dossier

# URL of local service responsible for reloading the Sorting Desk Firefox
# extension
readonly URL_FIREFOX_RELOAD=http://localhost:8888