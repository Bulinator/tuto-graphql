import React from 'react';
import { ApolloProvider } from 'react-apollo';
import {
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws';
import AppWithNavigationState, { navigationReducer } from './src/navigation';

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
const client = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
});

const store = createStore(
  combineReducers({
    apollo: client.reducer(),
    nav: navigationReducer,
  }),
  {}, // initial state
  composeWithDevTools(applyMiddleware(client.middleware())),
);

export default class App extends React.Component {
  render() {
    return (
      <ApolloProvider store={store} client={client}>
        <AppWithNavigationState />
      </ApolloProvider>
    );
  }
}
