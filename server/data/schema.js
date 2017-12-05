import { makeExecutableSchema } from 'graphql-tools';
import { Resolvers } from './resolvers';

export const Schema = [`
  # declare custom scalars
  scalar Date

  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
  }

  type MessageEdge {
    cursor: String!
    node: Message!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # input for updating groups
  input UpdateGroupInput {
    id: Int!
    lastRead: Int
    name: String
    userIds: [Int!]
  }

  # a group chat entity
  type Group {
    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the Group
    messages(first: Int, after: String, last: Int, before: String): MessageConnection # messages sent to the group
    lastRead: Message # message last read by user
    unreadCount: Int # number of unread messages by user
    icon: String # url for icon image
  }

  # a user -- keep it simple for the moment
  type User {
    id: Int! # unique id for the user
    email: String! # we will also require a unique email per user
    username: String # this is the name we'll show to others users
    messages: [Message] # message sent by user
    groups: [Group] # groups the users belongs to
    friends: [User] # user's friends contacts
  }

  # a message sent from a user to a groups
  type Message {
    id: Int! # unique id for message
    to: Group! # group message was sent in
    from: User! # user who sent the message
    text: String! # message text
    createdAt: Date! # when message was created
  }

  # query for types registered above
  type Query {
    # return a user by email or id
    user(email: String, id: Int): User

    # Return messages sent by user via userId
    # Return messages sent to a group via groupId
    messages(groupId: Int, userId: Int): [Message]

    # Return a group by its id
    group(id: Int!): Group
  }

  # create mutation Schema
  type Mutation  {
    # send a message to a group
    createMessage(
      text: String!, userId: Int!, groupId: Int!
    ): Message
    createGroup(name: String!, userIds: [Int], userId: Int!): Group
    leaveGroup(id: Int!, userId: Int!): Group # let user leave a grp
    updateGroup(group: UpdateGroupInput!): Group
    deleteGroup(id: Int!): Group
  }

  type Subscription {
    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
    messageAdded(groupIds: [Int]): Message
    groupAdded(userId: Int): Group
  }

  # return query
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  },
`];

export const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers,
});

export default executableSchema;
