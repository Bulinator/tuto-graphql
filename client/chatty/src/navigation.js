import PropTypes from 'prop-types';
import React from 'react';
import { Text, View } from 'react-native';
import { connect } from 'react-redux';
import {
  addNavigationHelpers,
  StackNavigator,
  TabNavigator,
} from 'react-navigation';

import Groups from './screens/groups';
import Messages from './screens/messages';

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
const AppWithNavigationState = ({ dispatch, nav }) => (
  <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />
);

AppWithNavigationState.propTypes = {
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
};

const MapStateToProps = state => ({
  nav: state.nav,
});

export default connect(MapStateToProps, null)(AppWithNavigationState);
