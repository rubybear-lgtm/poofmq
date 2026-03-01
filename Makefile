.PHONY: infra-up infra-down bootstrap portal-dev full-stack

infra-up:
	docker compose up -d redis postgres

infra-down:
	docker compose down

bootstrap:
	cp -n .env.example .env || true
	composer install
	npm install
	docker compose up -d redis postgres
	php artisan key:generate --force
	php artisan migrate --force

portal-dev:
	composer run dev

full-stack:
	docker compose up -d
	composer run dev
