import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

// get the user and all user's groups
export const USER_QUERY = gql`
  query user($id: Int) {
    user(id: $id) {
      id
      email
      username
      groups {
        id
        name
        messages(first: 1) { # we do not need to use variables here
          edges {
            cursor
            node {
              ... MessageFragment
            }
          }
        }
      }
      friends {
        id
        username
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default USER_QUERY;
