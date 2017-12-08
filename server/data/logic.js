import { Message } from './connectors';

// reusable function to check for a user with context
function getAuthenticatedUser(ctx) {
  return ctx.user.then((user) => {
    if (!user) {
      return Promise.error('Unauthorized');
    }
    return user;
  });
}

export const messageLogic = {
  from(message) {
    return message.getUser({ attributes: ['id', 'username'] });
  },
  to(message) {
    return message.getGroup({ attributes: ['id', 'name'] });
  },
  createMessage(_, { text, groupId }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getGroups({ where: { id: groupId }, attributes: ['id'] })
        .then((group) => {
          if (group.length) {
            return Message.create({
              userId: user.id,
              text,
              groupId,
            });
          }
          return Promise.reject('Unauthorized');
        }));
  },
};
