# settings.sh.default --- Contains DEFAULT project settings used by Bash scripts.
#
# Copyright (c) 2015 Diffeo
#
# Comments:
#

# URL of local service responsible for reloading the Sorting Desk Firefox
# extension
readonly URL_FIREFOX_RELOAD=http://localhost:8888

# Delay in seconds before the `update-deps´ script is executed when a file is
# created, modified, deleted or moved in within the `src/´ subtree.  This
# applies to the `watch-deps´ script.
readonly DELAY_UPDATE=1

# Hostname of the dossier.models server instance.
readonly DOSSIER_MODELS_HOST=localhost

# Port of the dossier.models server instance.
readonly DOSSIER_MODELS_PORT=8001

# URL of Dossier stack excluding prefixes
# Note that there is a dev server @ http://54.174.195.250:8080
readonly DOSSIER_MODELS_URL="$DOSSIER_MODELS_HOST:$DOSSIER_MODELS_PORT"

# Prefix to append to Dossier Stack URL
# Note: ensure prefix BEGINS with a forward slash but does NOT end with one.
readonly DOSSIER_MODELS_URL_PREFIX=/dossier

# Full path to yaml file containing the settings for a dossier.models instance.
readonly DOSSIER_MODELS_PATH_YAML=~/dev/diffeo/miguel.yaml