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
JSDOC_SOURCES=src/sorting-queue/sorting_queue.js


all: test build man

help:
	echo "Usage: make [ build | man | clean | deps | test ]"

build: deps minify build-chrome build-firefox

man:
	>&2 echo "W: generation of documentation disabled"
	# test -d "$(DIR_OUTPUT_DOC)" || mkdir -p "$(DIR_OUTPUT_DOC)"
	# $(JSDOC) -c="$(JSDOC_CONF)" -d="$(DIR_OUTPUT_DOC)" $(JSDOC_SOURCES)

clean:
	echo "I: removing output directory"
	rm -vfr "$(DIR_OUTPUT)"
	echo "I: deleting extraneous files"
	find -type f \( -name '*~' -or -name '\#*' -or -name '.\#*' \) \
		-exec rm -fv {} +

deps:
	echo "I: updating dependencies"
	sh/update-deps >/dev/null

test: build-chrome build-firefox test-extensions

test-extensions:
	echo "I: running all tests"
	sh/run-tests

minify:
	>&2 echo "W: minification of javascript files not yet implemented"
	# test -d "$(DIR_OUTPUT_SRC)" || mkdir -p "$(DIR_OUTPUT_SRC)"

build-chrome:
	echo "I: packaging chrome extension"
	sh/build-chrome >/dev/null

build-firefox:
	echo "I: packaging firefox extension"
	sh/build-firefox >/dev/null

.SILENT:

.NOTPARALLEL: