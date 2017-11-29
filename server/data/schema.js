export const Schema = [`
  # declare custom scalars
  scalar Date

  # a group chat entity
  type Group {
    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the Group
    messages: [Message] # messages sent to the group
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
  }

  # return query
  schema {
    query: Query
    mutation: Mutation
  },
`];

export default Schema;
