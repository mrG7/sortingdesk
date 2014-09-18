# Sorting Desk: project make file
# 
# Copyright (c) 2014 Diffeo
# Author: Miguel Guedes <miguel@miguelguedes.org>


DIR_OUTPUT=out
DIR_OUTPUT_DOC=$(DIR_OUTPUT)/doc

JSDOC=jsdoc
JSDOC_CONF=jsdoc.conf
JSDOC_SOURCES=src/main/SortingDesk.js


all: build man

help:
	echo "Usage: make [ build | man | clean ]"

build:
	echo "Minification of javascript files not yet implemented"
	test -d "$(DIR_OUTPUT)/src" || mkdir -p "$(DIR_OUTPUT_SRC)"

man:
	test -d "$(DIR_OUTPUT_DOC)" || mkdir -p "$(DIR_OUTPUT_DOC)"
	$(JSDOC) -c="$(JSDOC_CONF)" -d="$(DIR_OUTPUT_DOC)" $(JSDOC_SOURCES)

clean:
	echo Removing output directory
	rm -vfr "$(DIR_OUTPUT)"
	echo Deleting extraneous files
	find \( -name '*~' -or -name '\#*' -or -name '.\#*' \) -delete -print

.SILENT: