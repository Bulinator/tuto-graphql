import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import bodyParser from 'body-parser';
import { createServer } from 'http';

import { Resolvers } from './data/resolvers';
import { Schema } from './data/schema';
// import { Mocks } from './data/mocks';

const GRAPHQL_PORT = 8080;
const app = express();
const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers,
});

// as we have still no data, we use fixture with mock
// addMockFunctionsToSchema({
//  schema: executableSchema,
//  mocks: Mocks,
//  preserveResolvers: true,
// });

// 'context' must be an oject and cannot be undefined when using connectors
app.use('/graphql', bodyParser.json(), graphqlExpress({
  schema: executableSchema,
  context: {}, // at least an empty object
}));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
}));

const graphQLServer = createServer(app);

graphQLServer.listen(GRAPHQL_PORT, () => console.log(`graphQLServer is running like the white rabbit on http://localhost:${GRAPHQL_PORT}/graphiql`));
