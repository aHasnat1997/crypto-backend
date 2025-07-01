FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm rebuild bcrypt --build-from-source

EXPOSE 3030

CMD [ "npm", "run", "dev" ]
