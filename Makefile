.PHONY: all build package clean dev install help

NODE_MODULES := node_modules/.package-lock.json
DIST         := dist/manifest.json
KEY          := keys/private-key.pem

# ── Цели ──────────────────────────────────────────────────────────────────────

all: package

## build  — TypeScript-проверка + сборка в dist/
build: $(NODE_MODULES)
	npm run build

## package — сборка + упаковка в build/*.zip и build/*.crx
package: $(NODE_MODULES)
	node scripts/package.js

## package-only — упаковать уже собранный dist/ (без повторной сборки)
package-only: $(DIST)
	node scripts/package.js --package-only

## dev    — watch-режим: пересборка при изменении файлов
dev: $(NODE_MODULES)
	npm run build:watch

## install — установить зависимости (npm ci)
install:
	npm ci

## clean  — удалить dist/ и build/
clean:
	rm -rf dist/ build/

## help   — показать эту справку
help:
	@echo ""
	@echo "  Использование: make [цель]"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  /'
	@echo ""
	@echo "  Результаты сборки:"
	@echo "    dist/   — собранное расширение (для загрузки в Chrome)"
	@echo "    build/  — ZIP и CRX3 архивы"
	@echo ""
	@echo "  Ключ CRX3:"
	@echo "    Первый запуск make package создаёт keys/private-key.pem"
	@echo "    Сохраните этот файл — он нужен для обновлений расширения"
	@echo ""

# ── Внутренние правила ────────────────────────────────────────────────────────

$(NODE_MODULES): package.json package-lock.json
	npm ci
	@touch $@

$(DIST): $(NODE_MODULES)
	@if [ ! -f "$(DIST)" ]; then \
		echo "dist/ не найден, запускаю сборку..."; \
		npm run build; \
	fi
