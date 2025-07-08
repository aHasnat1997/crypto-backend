# Crypto Backend

A modular, OOP, scalable backend using Express, Prisma, and TypeScript. Includes Socket.IO, Docker, and Nginx support.

## Features
- Modular, feature-based structure
- OOP controllers/services
- Centralized Prisma access (`this.db`)
- Centralized routing (`this.route`)
- Socket.IO integration
- Docker & Nginx config

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Generate Prisma client:
   ```sh
   npx prisma generate
   ```
3. Run migrations:
   ```sh
   npx prisma db push
   ```
4. Start development server:
   ```sh
   npm run dev
   ```

Or use Docker Compose:

```sh
docker-compose up --build
```

## Add more modules in `src/modules/` as needed.
