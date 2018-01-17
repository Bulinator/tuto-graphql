import gql from 'grahpql-tag';

const SIGNUP_MUTATION = glq`
  mutation signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) {
      id
      jwt
      username
    }
  }
`;

export default SIGNUP_MUTATION;
