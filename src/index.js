import http from 'http';
import DataLoader from 'dataloader';
import loaders from './loaders';
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

const batchUsers = async (keys, models) => {
  const users = await models.User.findAll({
    where: {
      id: {
        $in: keys,
      },
    },
  });

  return keys.map(key => users.find(user => user.id === key));
};

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

const userLoader = new DataLoader(keys => batchUsers(keys, models));

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
  context: async ({ req, connection }) => {
    if (connection) {
      return {
        models,
        loaders: {
          user: new DataLoader(keys =>
            loaders.user.batchUsers(keys, models),
          ),
        },
      };
    }

    if (req) {
      const me = await getMet(req);

      return {
        models,
        me,
        secret: process.env.SECRET,
        loaders: {
          user: new DataLoader(keys =>
            loaders.user.batchUsers(keys, models),
          ),
        },
      };
    }
  },
});

server.applyMiddleware({ app, path: '/graphql' });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const eraseDatabaseOnSync = true;

const isTest = !!process.env.TEST_DATABASE;

sequelize.sync({ froce: isTest }).then(async () => {
  if (isTest) {
    createWithMessages(new Date());
  }

  httpServer.listen({ port: 8080 }, () => {
    console.log(
      'Apollo Server running on http://localhost:8080/graphql',
    );
  });
});

const createWithMessages = async date => {
  await models.User.create(
    {
      username: 'marcuscarneiro',
      email: 'marcuscarneiro@outlook.com',
      password: '1234567',
      role: 'ADMIN',
      messages: [
        {
          text: 'It worked...',
          createdAt: date.setSeconds(date.setSeconds() + 1),
        },
        {
          text: '...so them well!',
          createdAt: date.setSeconds(date.setSeconds() + 1),
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
          createdAt: date.setSeconds(date.setSeconds() + 1),
        },
        {
          text: 'Segunda mensagem',
          createdAt: date.setSeconds(date.setSeconds() + 1),
        },
      ],
    },
    {
      include: [models.Message],
    },
  );
};
