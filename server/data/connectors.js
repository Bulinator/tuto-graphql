import { _ } from 'lodash';
import Sequelize from 'sequelize';
import faker from 'faker';
import bcrypt from 'bcrypt';

// init database
const db = new Sequelize('chatty', null, null, {
  dialect: 'sqlite',
  storage: './chatty.sqlite',
  logging: true,
});

// define groups
const GroupModel = db.define('group', {
  name: { type: Sequelize.STRING },
});

// define message
const MessageModel = db.define('message', {
  text: { type: Sequelize.STRING }
});

// Define users
const UserModel = db.define('user', {
  email: { type: Sequelize.STRING },
  username: { type: Sequelize.STRING },
  password: { type: Sequelize.STRING },
});

// users belogns to multiple groups
UserModel.belongsToMany(GroupModel, { through: 'GroupUser' });

// users belong to multiple users as friends
UserModel.belongsToMany(UserModel, { through: 'Friends', as: 'friends' });

// message are sent from users
MessageModel.belongsTo(UserModel);

// message are sent to GroupUser
MessageModel.belongsTo(GroupModel);

// groups have multiple users
GroupModel.belongsToMany(UserModel, { through: 'GroupUser' });

// generate fake data
const GROUPS = 4;
const USERS_PER_GROUP = 5;
const MESSAGES_PER_USER = 5;
faker.seed(123); // get consistent data every time we reload app

db.sync({ force: true }).then(() => _.times(GROUPS, () => GroupModel.create({
  name: faker.lorem.words(3),
}).then(group => _.times(USERS_PER_GROUP, () => {
  const password = faker.internet.password();
  return bcrypt.hash(password, 10).then(hash => group.createUser({
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: hash,
  }).then((user) => {
    console.log(
      '{email, username, password}',
      `{${user.email}, ${user.username}, ${password}}`
    );
    _.times(MESSAGES_PER_USER, () => MessageModel.create({
      userId: user.id,
      groupId: group.id,
      text: faker.lorem.sentences(3),
    }));
    return user;
  }));
})).then((userPromises) => {
  // make users friends with all users in the group
  Promise.all(userPromises).then((users) => {
    _.each(users, (current, i) => {
      _.each(users, (user, j) => {
        if (i !== j) {
          current.addFriend(user);
        }
      });
    });
  });
})));

const Group = db.models.group;
const Message = db.models.message;
const User = db.models.user;

export { Group, Message, User };
