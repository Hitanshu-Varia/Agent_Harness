.PHONY: dev build migrate test clean

dev:
	docker compose up

build:
	docker compose build

migrate:
	docker compose exec backend alembic upgrade head

test:
	cd backend && pip install pytest && pytest
	# NOTE: Add your frontend testing commands here if configured
	cd frontend && npm run build

clean:
	docker compose down -v
	find . -type d -name __pycache__ -exec rm -r {} +
	rm -rf backend/.pytest_cache
	rm -rf frontend/.next
	rm -rf frontend/node_modules
