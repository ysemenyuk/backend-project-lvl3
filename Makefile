install: install-deps

install-deps:
	npm ci

run:
	page-loader --output tmp https://page-loader.hexlet.repl.co/

run-log:
	DEBUG=page-loader page-loader --output tmp https://page-loader.hexlet.repl.co/

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

.PHONY: test