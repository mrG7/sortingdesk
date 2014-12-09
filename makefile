# Project make file
# 
# Copyright (c) 2014 Diffeo
# Author: Miguel Guedes <miguel@miguelguedes.org>


DIR_OUTPUT=out
DIR_OUTPUT_DOC=$(DIR_OUTPUT)/doc
DIR_OUTPUT_SRC=$(DIR_OUTPUT)/src

JSDOC=jsdoc
JSDOC_CONF=jsdoc.conf
JSDOC_SOURCES=src/SortingQueue/SortingQueue.js


all: build man

help:
	echo "Usage: make [ build | man | clean ]"

build:
	echo "Minification of javascript files not yet implemented"
	test -d "$(DIR_OUTPUT_SRC)" || mkdir -p "$(DIR_OUTPUT_SRC)"

man:
	test -d "$(DIR_OUTPUT_DOC)" || mkdir -p "$(DIR_OUTPUT_DOC)"
	$(JSDOC) -c="$(JSDOC_CONF)" -d="$(DIR_OUTPUT_DOC)" $(JSDOC_SOURCES)

clean:
	echo Removing output directory
	rm -vfr "$(DIR_OUTPUT)"
	echo Deleting extraneous files
	find -type f \( -name '*~' -or -name '\#*' -or -name '.\#*' \) -exec rm -fv {} +

.SILENT: