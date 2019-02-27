import uuidv4 from 'uuid/v4';
import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated, isMessageOwner } from './athorization';

export default {
  Query: {
    messages: async (parent, args, { models }) => {
      return await models.Message.findAll();
    },
    message: async (parent, { id }, { models }) => {
      return models.Message.findById(id);
    },
  },
  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text }, { me, models }) => {
        return await models.Message.create({
          text,
          userId: me.id,
        });
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
    user: (message, args, { models }) => {
      return models.users[message.userId];
    },
  },
};
