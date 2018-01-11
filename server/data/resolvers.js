import GraphQLDate from 'graphql-date';
import { withFilter } from 'graphql-subscriptions';
import { map } from 'lodash';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { Group, Message, User } from './connectors';
import { pubsub } from '../subscriptions';
import { JWT_SECRET } from '../config';
import { groupLogic, messageLogic, userLogic } from './logic';

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
    group(_, args, ctx) {
      //return Group.find({ where: args });
      return groupLogic.query(_, args, ctx); // after added group logic in logic file
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
    user(_, args, ctx) {
      //return User.findOne({ where: args });
      return userLogic.query(_, args, ctx);
    },
  },
  Mutation: {
    createMessage(_, args, ctx) {
      return messageLogic.createMessage(_, args, ctx)
        .then((message) => {
          // Publish subscription notification with message
          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
          return message;
        });
    },
    createGroup(_, { name, userIds, userId }) {
      return groupLogic.createGroup(_, args, ctx).then((group) => {
        pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
        return group;
      });
      /*
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
      */
    },
    deleteGroup(_, args, ctx) {
      return groupLogic.deleteGroup(_, args, ctx);
      /*
      return Group.find({ where: id })
        .then(group => group.getUsers()
          .then(users => group.removeUsers(users))
          .then(() => Message.destroy({ where: { groupId: group.id } }))
          .then(() => group.destroy()),
        );
      */
    },
    leaveGroup(_, args, ctx) {
      return groupLogic.leaveGroup(_, args, ctx);
      /*
      return Group.findOne({ where: id })
        .then((group) => {
          group.removeUser(userId);
          return { id };
        });
      */
    },
    updateGroup(_, args, ctx) {
      return groupLogic.updateGroup(_, args, ctx);
      /*
      return Group.findOne({ where: { id } })
        .then(group => group.update({ name }));
      */
    },
    login(_, { email, password }, ctx) {
      // find userByEmail
      return User.findOne({ where: { email } })
        .then((user) => {
          if (user) {
            // validate password
            return bcrypt.compare(password, user.password)
              .then((res) => {
                if (res) {
                  // Create json web token
                  const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    version: user.version,
                  }, JWT_SECRET);
                  user.jwt = token;
                  ctx.user = Promise.resolve(user);
                  return user;
                }

                return Promise.errors('password incorrect dude');
              });
          }
          return Promise.errors('email not found');
        });
    },
    signup(_, { email, password, username, }, ctx) {
      // find userByEmail
      return User.findOne({ where: { email } }).then((existing) => {
        if (!existing) {
          // Hash password and create user
          return bcrypt.hash(password, 10).then(hash => User.create({
            email,
            password: hash,
            username: username || email,
            version: 1,
          })).then((user) => {
            const { id } = user;
            const token = jwt.sign({ id, email, version: 1 }, JWT_SECRET);
            user.jwt = token;
            ctx.user = Promise.resolve(user);
            return user;
          });
        }
        // email already exist
        return Promise.error('Email already exists. Please use another one!');
      });
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
        (payload, args, ctx) => {
          return ctx.user.then((user) => {
            return Boolean(
              args.groupIds &&
              ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
              user.id !== payload.messageAdded.userId, // don't send to user creating message
            );
          });
        },
      ),
    },
    groupAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
        (payload, args, ctx) => {
          return ctx.user.then((user) => {
            return Boolean(
              args.userId &&
              ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
              user.id !== payload.groupAdded.users[0].id, // don't send to user creating group
            );
          });
        },
      ),
    },
  },
  Group: {
    users(group, args, ctx) {
      return groupLogic.users(group, args, ctx);
    },
    messages(group, args, ctx) {
      return groupLogic.messages(group, args, ctx);
    },
  },
  Message: {
    to(message, args, ctx) {
      return messageLogic.to(message, args, ctx);
    },
    from(message, args, ctx) {
      return messageLogic.from(message, args, ctx);
    },
  },
  User: {
    email(user, args, ctx) {
      return userLogic.email(user, args, ctx);
    },
    friends(user, args, ctx) {
      return userLogic.friends(user, args, ctx);
    },
    groups(user, args, ctx) {
      return userLogic.groups(user, args, ctx);
    },
    jwt(user, args, ctx) {
      return userLogic.jwt(user, args, ctx);
    },
    messages(user, args, ctx) {
      return userLogic.messages(user, args, ctx);
    },
  },
};

export default Resolvers;
