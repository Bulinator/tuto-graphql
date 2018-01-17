import React, { Component } from 'react';
import {
  AsyncStorage,
} from 'react-native';
import { ApolloProvider } from 'react-apollo';
import {
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws';
import { persistStore, autoRehydrate } from 'redux-persist';
import thunk from 'redux-thunk';
import AppWithNavigationState, { navigationReducer } from './src/navigation';
import auth from './src/reducers/auth.reducer';

const GRAPHQL_URL = '192.168.1.3:8080';
// graphql endpointURL
const networkInterface = createNetworkInterface({ uri: `http://${GRAPHQL_URL}/graphql` });
export const wsClient = new SubscriptionClient(`ws://${GRAPHQL_URL}/subscriptions`, {
  reconnect: true,
  connectionParams: {
    // Pass any arguments you want for initialization
  },
});
// extends network interface with websocket
const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
);
// finally, create appoloClient instance with the modified network interface
export const client = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
});

const store = createStore(
  combineReducers({
    apollo: client.reducer(),
    nav: navigationReducer,
    auth,
  }),
  {}, // initial state
  composeWithDevTools(
    applyMiddleware(client.middleware(), thunk),
    autoRehydrate(),
  ),
);

// Persistent storage
persistStore(store, {
  storage: AsyncStorage,
  blacklist: ['apollo', 'nav'], // do not persist apollo or nav for now
});

export default class App extends Component {
  render() {
    return (
      <ApolloProvider store={store} client={client}>
        <AppWithNavigationState />
      </ApolloProvider>
    );
  }
}
