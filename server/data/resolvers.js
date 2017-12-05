import GraphQLDate from 'graphql-date';
import { withFilter } from 'graphql-subscriptions';
import { map } from 'lodash';
import { Group, Message, User } from './connectors';
import { pubsub } from '../subscriptions';

const MESSAGE_ADDED_TOPIC = 'messageAdded';
const GROUP_ADDED_TOPIC = 'groupAdded';

export const Resolvers = {
  Date: GraphQLDate,
  PageInfo: {
    // we will have each connection supply its own hasNext/hasPrev functions!
    hasNextPage(connection, args) {
      return connection.hasNextPage();
    },
    hasPreviousPage(connection, args) {
      return connection.hasPreviousPage();
    },
  },
  Query: {
    group(_, args) {
      return Group.find({ where: args });
    },
    messages(_, args) {
      return Message.findAll({
        where: {
          groupId: 1, // get messages within Group with id = 1
          id: { $lt: 25 }, // get messages before #25 ~ message.id < 25
        },
        order: [['id', 'DESC']],
        limit: 10,
      });
    },
    user(_, args) {
      return User.findOne({ where: args });
    },
  },
  Mutation: {
    createMessage(_, { text, userId, groupId }) {
      return Message.create({
        userId,
        text,
        groupId,
      }).then((message) => {
        // publish subscription notification with the whole message
        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
        return message;
      });
    },
    createGroup(_, { name, userIds, userId }) {
      return User.findOne({ where: { id: userId } })
        .then(user => user.getFriends({ where: { id: { $in: userIds } } })
          .then(friends => Group.create({
            name,
            users: [user, ...friends],
          })
            .then(group => group.addUsers([user, ...friends])
              .then((res) => {
                // append the user list to the group object
                // to pass to pubsub so we can check members
                group.users = [user, ...friends];
                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
                return group;
              }),
            ),
          ),
        );
    },
    deleteGroup(_, {  id }) {
      return Group.find({ where: id })
        .then(group => group.getUsers()
          .then(users => group.removeUsers(users))
          .then(() => Message.destroy({ where: { groupId: group.id } }))
          .then(() => group.destroy()),
        );
    },
    leaveGroup(_, { id, userId }) {
      return Group.findOne({ where: id })
        .then((group) => {
          group.removeUser(userId);
          return { id };
        });
    },
    updateGroup(_, { id, name }) {
      return Group.findOne({ where: { id } })
        .then(group => group.update({ name }));
    },
  },
  Subscription: {
    messageAdded: {
      // The subscription payload is the message
      subscribe: withFilter(() => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC), (payload, args) => {
        return Boolean(
          args.groupIds &&
          ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
          args.userId !== payload.messageAdded.userId, // do not send to user creating message
        );
      }),
    },
    groupAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
        (payload, args) => {
          return Boolean(
            args.userId &&
            ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
            args.userId !== payload.groupAdded.users[0].id, // do not send to user creating group
          );
        },
      ),
    },
  },
  Group: {
    users(group) {
      return group.getUsers();
    },
    messages(group, { first, last, before, after }) {
      // base query -- get messages from the right group
      const where = { groupId: group.id };

      // because we return messages from newest -> oldest
      // before actually means newer (id > cursor)
      // after actually means older (id < cursor)
      if (before) {
        // convert base-64 to utf8 id
        where.id = { $gt: Buffer.from(before, 'base64').toString() };
      }

      if (after) {
        where.id = { $lt: Buffer.from(after, 'base64').toString() };
      }

      return Message.findAll({
        where,
        order: [['id', 'DESC']],
        limit: first || last,
      }).then((messages) => {
        const edges = messages.map(message => ({
          cursor: Buffer.from(message.id.toString()).toString('base64'), // convert id to cursor
          node: message, // the node is the message itself
        }));
        return {
          edges,
          pageInfo: {
            hasNextPage() {
              if (messages.length < (last || first)) {
                return Promise.resolve(false);
              }

              return Message.findOne({
                where: {
                  groupId: group.id,
                  id: {
                    [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
                  },
                },
                order: [['id', 'DESC']],
              }).then(message => !!message);
            },
            hasPreviousPage() {
              return Message.findOne({
                where: {
                  groupId: group.id,
                  id: where.id,
                },
                order: [['id']],
              }).then(message => !!message);
            },
          },
        };
      });
    },
  },
  Message: {
    to(message) {
      return message.getGroup();
    },
    from(message) {
      return message.getUser();
    },
  },
  User: {
    messages(user) {
      return Message.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
      });
    },
    groups(user) {
      return user.getGroups();
    },
    friends(user) {
      return user.getFriends();
    },
  },
};

export default Resolvers;
