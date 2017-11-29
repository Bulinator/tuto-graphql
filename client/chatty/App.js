import React from 'react';
import { ApolloProvider } from 'react-apollo';
import {
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import AppWithNavigationState, { navigationReducer } from './src/navigation';

const GRAPHQL_URL = '192.168.1.3:8080';
const networkInterface = createNetworkInterface({ uri: `http://${GRAPHQL_URL}/graphql` });
const client = new ApolloClient({ networkInterface });

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
