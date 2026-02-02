.PHONY: setup dev up down build clean help

help:
	@echo "SwarmStudio Management"
	@echo "======================"
	@echo "make setup   - Install dependencies and configure .env"
	@echo "make dev     - Start development server"
	@echo "make up      - Start production container on port 80"
	@echo "make down    - Stop production container"

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Attempting to detect Public IP..."; \
		PUBLIC_IP=$$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com); \
		if [ -n "$$PUBLIC_IP" ]; then \
			sed -i.bak "s|VITE_APP_PUBLIC_URL=.*|VITE_APP_PUBLIC_URL=http://$$PUBLIC_IP|" .env; \
			sed -i.bak "s|VITE_API_HOST=.*|VITE_API_HOST=http://$$PUBLIC_IP:8000|" .env; \
			rm -f .env.bak; \
			echo "Updated .env with IP: $$PUBLIC_IP"; \
		fi \
	else \
		echo ".env already exists. Skipping generation."; \
	fi

install:
	npm install

dev:
	npm run dev -- --host

up:
	docker build -t swarmstudio .
	-docker rm -f swarmstudio 2>/dev/null || true
	docker run -d --restart unless-stopped -p 80:5173 --name swarmstudio swarmstudio
	@echo "Server running on port 80"

down:
	docker stop swarmstudio || true
	docker rm swarmstudio || true

build:
	docker build -t swarmstudio .

clean:
	rm -rf node_modules .svelte-kit build