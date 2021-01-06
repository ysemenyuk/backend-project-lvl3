install: install-deps

install-deps:
	npm ci

run:
	page-loader -o ./page-loader https://page-loader.hexlet.repl.co/

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

.PHONY: test