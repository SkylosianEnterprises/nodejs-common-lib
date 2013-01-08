all: test

test: deps
	runtests build

deps: 
	npm install .

package:
	npm pack .

clean:
	 rm -rf reports
	 rm -rf build

.PHONY: all test deps clean 
