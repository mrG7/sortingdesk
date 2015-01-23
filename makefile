# makefile --- Master make file
#
# Copyright (c) 2015 Diffeo
#
# Comments:
#


DIR_OUTPUT=out
DIR_OUTPUT_DOC=$(DIR_OUTPUT)/doc
DIR_OUTPUT_SRC=$(DIR_OUTPUT)/src

JSDOC=jsdoc
JSDOC_CONF=jsdoc.conf
JSDOC_SOURCES=src/SortingQueue/SortingQueue.js


all: build man

help:
	echo "Usage: make [ build | man | clean | deps ]"

build: minify ext-chrome

man:
	test -d "$(DIR_OUTPUT_DOC)" || mkdir -p "$(DIR_OUTPUT_DOC)"
	$(JSDOC) -c="$(JSDOC_CONF)" -d="$(DIR_OUTPUT_DOC)" $(JSDOC_SOURCES)

clean:
	echo "I: removing output directory"
	rm -vfr "$(DIR_OUTPUT)"
	echo "I: deleting extraneous files"
	find -type f \( -name '*~' -or -name '\#*' -or -name '.\#*' \) -exec rm -fv {} +

deps:
	echo "I: updating dependencies"
	sh/update-deps

minify:
	>&2 echo "W: minification of javascript files not yet implemented"
	# test -d "$(DIR_OUTPUT_SRC)" || mkdir -p "$(DIR_OUTPUT_SRC)"

ext-chrome:
	echo "I: packaging chrome extension"
	(cd src/browser/extensions && zip -r sortingdesk_chrome.zip chrome)
	mv src/browser/extensions/sortingdesk_chrome.zip ./

.SILENT:
