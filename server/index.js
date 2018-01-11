import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import jwt from 'express-jwt';
import jsonwebtoken from 'jsonwebtoken';

import { JWT_SECRET } from './config';
import { User } from './data/connectors';
import { getSubcriptionDetails } from './subscriptions'; // Make sure it's before exeSchm
import { executableSchema } from './data/schema';
import { subscriptionLogic } from './data/logic';

const GRAPHQL_IP = 'localhost';
const GRAPHQL_PORT = 8080;
const GRAPHQL_PATH = '/graphql';
const SUBSCRIPTIONS_PATH = '/subscriptions';
const app = express();


// as we have still no data, we use fixture with mock
// addMockFunctionsToSchema({
//  schema: executableSchema,
//  mocks: Mocks,
//  preserveResolvers: true,
// });

// 'context' must be an oject and cannot be undefined when using connectors
app.use('/graphql', bodyParser.json(), jwt({
  secret: JWT_SECRET,
  credentialsRequired: false,
}), graphqlExpress(req => ({
  schema: executableSchema,
  context: {
    user: req.user ?
      User.findOne({ where: { id: req.user.id, version: req.user.version } }) :
      Promise.resolve(null),
  }, // at least an empty object
})));

app.use('/graphiql', graphiqlExpress({
  endpointURL: GRAPHQL_PATH,
  subscriptionsEndpoint: `ws://${GRAPHQL_IP}:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`,
}));

const graphQLServer = createServer(app);

graphQLServer.listen(GRAPHQL_PORT, () => {
  console.log(`graphQL Server is running like the white rabbit on http://${GRAPHQL_IP}:${GRAPHQL_PORT}${GRAPHQL_PATH}`);
  console.log(`graphQL Subscription is running like the black rabbit on http://${GRAPHQL_IP}:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`);
});

// eslint-disable-next-line no-unused-vars
const subscriptionServer = SubscriptionServer.create({
  schema: executableSchema,
  execute,
  subscribe,
  onConnect(connectionParams, websocket) {
    if (connectionParams.jwt) {
      jsonwebtoken.verify(connectionParams.jwt, JWT_SECRET, (err, decoded) => {
        if (err) {
          rej('Invalid Token');
        } else {
          rej('NO Token');
        }
      });

      return userPromise.then((user) => {
        if (user) {
          return { user: Promise.resolve(user) };
        }

        return Promise.reject('No User');
      });
    }
  },
  onOperation(parsedMessage, baseParams) {
    // Need to implement this!!
    const { subscriptionName, args } = getSubcriptionDetails({
      baseParams,
      schema: executableSchema,
    });

    // We need to implement this too
    return subscriptionLogic[subscriptionName](baseParams, args, baseParams.context);
  },
}, {
  server: graphQLServer,
  path: SUBSCRIPTIONS_PATH,
});
