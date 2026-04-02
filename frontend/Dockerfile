FROM node:20-alpine

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
COPY certs/ ../certs/

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
