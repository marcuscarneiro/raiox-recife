import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated, isMessageOwner } from './athorization';
import Sequelize from 'sequelize';
import pubsub, { EVENTS } from '../subscription';

export default {
  Query: {
    messages: async (parent, { cursor, limit = 100 }, { models }) => {
      const cursorOptions = cursor
        ? {
            where: {
              createdAt: {
                [Sequelize.Op.lt]: cursor,
              },
            },
          }
        : {};
      const messages = await models.Message.findAll({
        order: [['createdAt', 'DESC']],
        limit,
        ...cursorOptions,
      });
      return {
        edges: messages,
        pageInfo: {
          endCursor: messages[messages.length - 1].createdAt,
        },
      };
    },
    message: async (parent, { id }, { models }) => {
      return models.Message.findById(id);
    },
  },
  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text }, { me, models }) => {
        const message = await models.Message.create({
          text,
          userId: me.id,
        });

        pubsub.publish(EVENTS.MESSAGE.CREATED, {
          messageCreated: { message },
        });

        return message;
      },
    ),
    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id }, { models }) => {
        return await models.Message.destroy({ where: { id } });
      },
    ),
    updateMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      (parent, { id, text }, { models }) => {
        const { [id]: message } = models.messages;

        if (!message) {
          return false;
        }

        message.text = text;
        models.messages[id] = message;

        return true;
      },
    ),
  },
  Message: {
    user: async (message, args, { loaders }) => {
      return await loaders.user.load(message.userId);
    },
  },
  Subscription: {
    messageCreated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.MESSAGE.CREATED),
    },
  },
};
