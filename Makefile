.PHONY: setup dev build up clean help

# Default target
help:
	@echo "SwarmStudio Management"
	@echo "======================"
	@echo "make setup   - Install dependencies and configure .env with auto-detected Public IP"
	@echo "make dev     - Start development server (exposed to network)"
	@echo "make build   - Build for production"
	@echo "make up      - Build and run production container on port 80"
	@echo "make clean   - Remove build artifacts and dependencies"

setup:
	@echo "Installing dependencies..."
	npm install
	@echo "Configuring environment..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Attempting to detect Public IP..."; \
		PUBLIC_IP=$$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com); \
		if [ -n "$$PUBLIC_IP" ]; then \
			echo "Detected Public IP: $$PUBLIC_IP"; \
			# Update VITE_APP_PUBLIC_URL to point to port 80 (implied) \
			sed -i.bak "s|VITE_APP_PUBLIC_URL=.*|VITE_APP_PUBLIC_URL=http://$$PUBLIC_IP|" .env; \
			# Update VITE_API_HOST assuming backend runs on same IP port 8000 \
			sed -i.bak "s|VITE_API_HOST=.*|VITE_API_HOST=http://$$PUBLIC_IP:8000|" .env; \
			rm -f .env.bak; \
			echo "Updated .env with public IP settings."; \
		else \
			echo "Could not automatically detect public IP. Please check .env manually."; \
		fi \
	else \
		echo ".env already exists. Skipping auto-generation."; \
	fi

dev:
	npm run dev -- --host

build:
	npm run build

up:
	@echo "Building and starting production container on port 80..."
	docker build -f Dockerfile.prod -t swarmstudio-prod .
	-docker rm -f swarmstudio-prod 2>/dev/null || true
	docker run -d --restart unless-stopped -p 80:3000 --name swarmstudio-prod swarmstudio-prod
	@echo "Server running at http://localhost (or your public IP)"

clean:
	rm -rf node_modules .svelte-kit build
