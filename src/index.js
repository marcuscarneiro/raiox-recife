import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  ApolloServer,
  AuthenticationError,
} from 'apollo-server-express';
import jwt from 'jsonwebtoken';

import schema from './schemas';
import resolvers from './resolvers';
import models, { sequelize } from './models';

const app = express();
const eraseDatabaseOnSync = true;

app.use(cors());

const getMet = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      throw new AuthenticationError(
        'Sua sessão expirou. Faça login novamente.',
      );
    }
  }
};

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  formatError: error => {
    const message = error.message
      .replace('SequelizeValidationError: ', 'Inválido?!')
      .replace('Validation error: ', '');

    return {
      ...error,
      message,
    };
  },
  context: async ({ req }) => {
    const me = await getMet(req);

    return {
      models,
      me,
      secret: process.env.SECRET,
    };
  },
});

server.applyMiddleware({ app, path: '/graphql' });

sequelize.sync({ froce: eraseDatabaseOnSync }).then(async () => {
  if (eraseDatabaseOnSync) {
    createWithMessages();
  }
  app.listen({ port: 8080 }, () => {
    console.log(
      'Apollo Server running on http://localhost:8080/graphql',
    );
  });
});

const createWithMessages = async () => {
  await models.User.create(
    {
      username: 'marcuscarneiro',
      email: 'marcuscarneiro@outlook.com',
      password: '1234567',
      role: 'ADMIN',
      messages: [
        {
          text: 'It worked...',
        },
        {
          text: '...so them well!',
        },
      ],
    },
    {
      include: [models.Message],
    },
  );
  await models.User.create(
    {
      username: 'alinecabral',
      email: 'alinecabral@gmail.com',
      password: '1234567',
      messages: [
        {
          text: 'Mensagem primeira',
        },
        {
          text: 'Segunda mensagem',
        },
      ],
    },
    {
      include: [models.Message],
    },
  );
};
