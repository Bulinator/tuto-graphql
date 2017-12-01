import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const CREATE_GROUP_MUTATION = gql`
mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
  createGroup(name: $name, userIds: $userIds, userId: $userId) {
    id
    name
    users {
      id
    }
    messages(first: 1) { # we do not need to use variables here
      edges {
        cursor
        node {
          ... MessageFragment
        }
      }
    }
  }
}
${MESSAGE_FRAGMENT}
`;

export default CREATE_GROUP_MUTATION;
