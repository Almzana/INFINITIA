FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Don't run as root
USER node

EXPOSE 3001
# Apply pending migrations, optionally seed demo data (RUN_SEED=true), then start the API
CMD ["sh", "-c", "npm run migrate up && if [ \"$RUN_SEED\" = \"true\" ]; then node scripts/seed.ts; fi && node src/index.ts"]
