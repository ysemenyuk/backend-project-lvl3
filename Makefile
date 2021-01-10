install: install-deps

install-deps:
	npm ci

run1:
	page-loader --output tmp https://1ysemenyuk.github.io

run1-log:
	DEBUG=page-loader page-loader --output tmp1 https://ysemenyuk.github.io

run:
	page-loader --output tmp https://page-loader.hexlet1.repl.co/

run-log:
	DEBUG=page-loader page-loader --output tmp https://page-loader.hexlet.repl.co/

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

.PHONY: test