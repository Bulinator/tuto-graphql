import { client } from '../../App';
import { SET_CURRENT_USER, LOGOUT } from '../helpers/constants';

export const setCurrentUser = user => ({
  type: SET_CURRENT_USER,
  user,
});

export const logout = () => {
  client.resetStore();
  return { type: LOGOUT };
};
