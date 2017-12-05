import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Text, View } from 'react-native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';
import { map } from 'lodash';
import { Buffer } from 'buffer';
import {
  addNavigationHelpers,
  StackNavigator,
  TabNavigator,
} from 'react-navigation';

import Groups from './screens/groups';
import NewGroup from './screens/new-group';
import FinalizeGroup from './screens/finalize-group';
import GroupDetails from './screens/group-details';
import Messages from './screens/messages';

import { USER_QUERY } from './graphql/user.query';
import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
import GROUP_ADDED_SUBSCRIPTION from './graphql/group-added.subscription';

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#777',
    fontSize: 10,
    justifyContent: 'center',
  },
  selected: {
    color: 'blue',
  },
};

const TestScreen = title => () => (
  <View style={styles.container}>
    <Text>
      {title}
    </Text>
  </View>
);

// Our main scene with tabs
// (probably CSSha@ck for android)
const MainScreenNavigator = TabNavigator({
  Chats: { screen: Groups },
  Settings: { screen: TestScreen('Settings') },
}, {
  tabBarOptions: {
    style: {
      backgroundColor: '#22313F',
    },
    labelStyle: { fontSize: 11 },
    showIcon: false,
    showLabel: true,
    iconStyle: { width: 24 },
  },
  tabBarPosition: 'bottom',
  lazyLoad: true,
  swipeEnabled: false,
});

// Navigation stack for our entire application
const AppNavigator = StackNavigator({
  Main: { screen: MainScreenNavigator },
  Messages: { screen: Messages },
  NewGroup: { screen: NewGroup },
  FinalizeGroup: { screen: FinalizeGroup },
  GroupDetails: { screen: GroupDetails },
}, {
  mode: 'modal', // has no effect on android
});

// reducer init composeWithDevTools
const firstAction = AppNavigator.router.getActionForPathAndParams('Main');
const tempNavState = AppNavigator.router.getStateForAction(firstAction);
const initialNavState = AppNavigator.router.getStateForAction(tempNavState);

// reducer code
export const navigationReducer = (state = initialNavState, action) => {
  let nextState;
  switch (action.type) {
    default:
      nextState = AppNavigator.router.getStateForAction(action, state);
      break;
  }

  // return original state or nextstate if 'null'
  return nextState || state;
};

// Navigation component that integrates with redux
class AppWithNavigationState extends Component {
  componentWillReceiveProps(nextProps) {
    if (!nextProps.user) {
      if (this.groupSubscription) {
        this.groupSubscription();
      }
      if (this.messagesSubscription) {
        this.messagesSubscription();
      }
    }
    if (nextProps.user &&
      (!this.props.user || nextProps.user.groups.length !== this.props.user.groups.length)) {
      // unsubscribe from old
      if (typeof this.messagesSubscription === 'function') {
        this.messagesSubscription();
      }
      // subscribe to new
      if (nextProps.user.groups.length) {
        this.messagesSubscription = nextProps.subscribeToMessages();
      }
    }
    if (!this.groupSubscription && nextProps.user) {
      this.groupSubscription = nextProps.subscribeToGroups();
    }
  }

  render() {
    const { dispatch, nav } = this.props;
    return <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />;
  }
}

/*
const AppWithNavigationState = ({ dispatch, nav }) => (
  <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />
);
*/

AppWithNavigationState.propTypes = {
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
  subscribeToGroups: PropTypes.func,
  subscribeToMessages: PropTypes.func,
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
    groups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ),
  }),
};

const mapStateToProps = state => ({
  nav: state.nav,
});

const userQuery = graphql(USER_QUERY, {
  options: () => ({ variables: { id: 1 } }), // fake the user for now
  props: ({ data: { loading, user, subscribeToMore } }) => ({
    loading,
    user,
    subscribeToMessages() {
      return subscribeToMore({
        document: MESSAGE_ADDED_SUBSCRIPTION,
        variables: {
          userId: 1, // fake the user for now
          groupIds: map(user.groups, 'id'),
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          const previousGroups = previousResult.user.groups;
          const newMessage = subscriptionData.data.messageAdded;
          const groupIndex = map(previousGroups, 'id').indexOf(newMessage.to.id);
          return update(previousResult, {
            user: {
              groups: {
                [groupIndex]: {
                  messages: {
                    edges: {
                      $set: [{
                        __typename: 'MessageEdge',
                        node: newMessage,
                        cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
                      }],
                    },
                  },
                },
              },
            },
          });
        },
      });
    },
    subscribeToGroups() {
      return subscribeToMore({
        document: GROUP_ADDED_SUBSCRIPTION,
        variables: { userId: user.id },
        updateQuery: (previousResult, { subscriptionData }) => {
          const newGroup = subscriptionData.data.groupAdded;
          return update(previousResult, {
            user: {
              groups: { $push: [newGroup] },
            },
          });
        },
      });
    },
  }),
});

export default compose(
  connect(mapStateToProps),
  userQuery,
)(AppWithNavigationState);
