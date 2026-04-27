# VideoHub — Backend

NestJS backend for the VideoHub platform. See the [root README](../README.md) for full documentation, setup instructions, and feature list.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, REDIS_URL
npx prisma db push
npm run start:dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api/docs`

## Tests

```bash
npm run test        # unit
npm run test:e2e    # end-to-end
npm run test:cov    # coverage
```
