# img-src-reframer — packaging.
#   make build  → unsigned .xpi (manifest at root); install on Dev Edition/Nightly/ESR
#                 with xpinstall.signatures.required=false, or temporarily via about:debugging.
#   make lint   → web-ext validation.
#   make sign   → AMO unlisted signing → permanent install on release Firefox.
#                 Needs AMO_KEY/AMO_SECRET (addons.mozilla.org → Manage API Keys).
#   make clean  → drop artifacts.

NAME    := img-src-reframer
VERSION := $(shell jq -r .version manifest.json)
XPI     := $(NAME)-$(VERSION).xpi
SRC     := manifest.json background.js popup content icons
IGNORE  := --ignore-files 'test/**' 'README.md' 'Makefile' '*.xpi'

.PHONY: build lint sign clean

build: $(XPI)

$(XPI): $(shell find $(SRC) -type f)
	@rm -f $@
	zip -r -FS $@ $(SRC)

lint:
	web-ext lint $(IGNORE)

sign:
	web-ext sign --channel=unlisted --api-key=$(AMO_KEY) --api-secret=$(AMO_SECRET) $(IGNORE)

clean:
	rm -f $(NAME)-*.xpi
	rm -rf web-ext-artifacts
