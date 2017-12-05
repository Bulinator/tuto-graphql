import { _ } from 'lodash';
import {
  FlatList,
  View,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Text,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import randomColor from 'randomcolor';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';
import { Buffer } from 'buffer';
import moment from 'moment';
import gql from 'graphql-tag';
import { Icon } from 'react-native-elements';

import { wsClient } from '../../App';
import Message from '../components/messages';
import MessageInput from '../components/messages-input';
import USER_QUERY from '../graphql/user.query';
import GROUP_QUERY from '../graphql/group.query';
import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
import UPDATE_GROUP_MUTATION from '../graphql/update-group.mutation';

import MESSAGE_ADDED_SUBSCRIPTION from '../graphql/message-added.subscription';

import ColorHelpers from '../helpers/ColorHelpers';

const styles = {
  container: {
    alignItems: 'stretch',
    backgroundColor: '#e5ddd5',
    flex: 1,
    flexDirection: 'column',
  },
  loading: {
    justifyContent: 'center',
  },
  titleWrapper: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleImage: {
    marginRight: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
};
const LOGO_URL = 'https://www.shareicon.net/data/2016/08/01/640324_logo_512x512.png';

const fakeData = () => _.times(100, i => ({
  // every message will have a different color
  color: randomColor(),
  // every 5th message will look like it's from the current user
  isCurrentUser: i % 5 === 0,
  message: {
    id: i,
    createdAt: new Date().toISOString(),
    from: {
      username: `Username ${i}`,
    },
    text: `Message ${i}`,
  },
}));

//function isDuplicateMessage(newMessage, existingMessages) {
// return newMessage.id !== null &&
// existingMessages.some(message => newMessage.id === message.id);//
// }

class Messages extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state, navigate } = navigation;

    const goToGroupDetails = navigate.bind(this, 'GroupDetails', {
      id: state.params.groupId,
      title: state.params.title,
    });

    return {
      title: state.params.title,
      headerStyle: {
        marginTop: (Platform.OS === 'android') ? 24 : 0,
        paddingRight: 10,
        paddingLeft: 5,
        backgroundColor: ColorHelpers.bgHeaderColor,
      },
      headerTitleStyle: {
        alignSelf: 'flex-start',
        color: ColorHelpers.txtHeaderColor,
      },
      headerRight:
        <Icon
          name="cog"
          color={'#000'}
          type='font-awesome'
          onPress={goToGroupDetails}
        />,
    };
  };

  constructor(props) {
    super(props);
    const usernameColors = {};
    if (props.group && props.group.users) {
      props.group.users.forEach((user) => {
        usernameColors[user.username] = randomColor();
      });
    }

    this.state = {
      usernameColors,
    };

    this.renderItem = this.renderItem.bind(this);
    this.send = this.send.bind(this);
    this.onEndReached = this.onEndReached.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const usernameColors = {};
    if (nextProps.group) {
      if (nextProps.group.users) {
        // Apply a color to each user
        nextProps.group.users.forEach((user) => {
          usernameColors[user.username] =
            this.state.usernameColors[user.username] || randomColor();
        });
      }

      // we don't resubscribe on changed props
      // because it never happens in our app
      if (!this.subscription) {
        this.subscription = nextProps.subscribeToMore({
          document: MESSAGE_ADDED_SUBSCRIPTION,
          variables: {
            userId: 1, // fake the user for now
            groupIds: [nextProps.navigation.state.params.groupId],
          },
          updateQuery: (previousResult, { subscriptionData }) => {
            const newMessage = subscriptionData.data.messageAdded;
            // if it's our own mutation
            // we might get the subscription result
            // after the mutation result.
            // if (isDuplicateMessage(newMessage, previousResult.group.messages)) {
            //  return previousResult;
            // }

            return update(previousResult, {
              group: {
                messages: {
                  edges: {
                    $unshift: [{
                      __typename: 'MessageEdge',
                      node: newMessage,
                      cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
                    }],
                  },
                },
              },
            });
          },
        });
      }

      if (!this.reconnected) {
        this.reconnected = wsClient.onReconnected(() => {
          this.props.refetch(); // Check for any data lost during disconnect
        }, this);
      }

      // update state
      this.setState({
        usernameColors,
      });
    } else if (this.reconnected) {
      this.reconnected(); // remove event subscription
    }
  }

  onEndReached() {
    if (!this.state.loadingMoreEntries &&
      this.props.group.messages.pageInfo.hasNextPage) {
        this.setState({
          loadingMoreEntries: true,
        });
        this.props.loadMoreEntries().then(() => {
          this.setState({
            loadingMoreEntries: false,
          });
        });
      }
  }

  keyExtractor = item => item.node.id;

  send(text) {
    this.props.createMessage({
      groupId: this.props.navigation.state.params.groupId,
      userId: 1, // fake user for now
      text,
    }).then(() => {
      this.flatList.scrollToEnd({ index: 0, animated: true });
    });
  }

  renderItem = ({ item: edge }) => {
    const message = edge.node;
    const userColor = this.state.usernameColors[message.from.username];
    return (
      <Message
        color={userColor || randomColor()} // {}
        isCurrentUser={message.from.id === 1} // until we add auth
        message={message}
      />
    );
  };

  render() {
    const { loading, group } = this.props;
    if (loading || !group) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }
    // render list of messages for group
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior="position"
          contentContainerStyle={styles.container}
          keyboardVerticalOffset={(Platform.OS === 'android') ? 74 : 64}
          style={styles.container}
        >
          <FlatList
            inverted
            ref={(ref) => { this.flatList = ref; }}
            data={group.messages.edges}
            keyExtractor={this.keyExtractor}
            renderItem={this.renderItem}
            ListEmptyComponent={<View />}
            onEndReached={this.onEndReached}
          />
          <MessageInput send={this.send} />
        </KeyboardAvoidingView>
      </View>
    );
  }
}

Messages.propTypes = {
  createMessage: PropTypes.func,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        groupId: PropTypes.number,
      }),
    }),
  }),
  group: PropTypes.shape({
    group: PropTypes.array,
    messages: PropTypes.shape({
      edges: PropTypes.arrayOf(PropTypes.shape({
        cursor: PropTypes.string,
        node: PropTypes.object,
      })),
      pageInfo: PropTypes.shape({
        hasNextPage: PropTypes.bool,
        hasPreviousPage: PropTypes.bool,
      }),
    }),
    users: PropTypes.array,
  }),
  loading: PropTypes.bool,
  loadMoreEntries: PropTypes.func,
  subscribeToMore: PropTypes.func,
  refetch: PropTypes.func,
};

const ITEMS_PER_PAGE = 10;
const groupQuery = graphql(GROUP_QUERY, {
  options: ownProps => ({
    variables: {
      groupId: ownProps.navigation.state.params.groupId,
      first: ITEMS_PER_PAGE,
    },
  }),
  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) => ({
    loading,
    group,
    refetch,
    subscribeToMore,
    loadMoreEntries() {
      return fetchMore({
      // query: ... (you can specify a different query.
      // GROUP_QUERY is used by default)
        variables: {
          // load more queries starting from the cursor of the last (oldest) message
          after: group.messages.edges[group.messages.edges.length - 1].cursor,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          // we will make an extra call to check if no more entries
          if (!fetchMoreResult) { return previousResult; }
          // push results (older messages) to end of messages list
          return update(previousResult, {
            group: {
              messages: {
                edges: { $push: fetchMoreResult.group.messages.edges },
                pageInfo: { $set: fetchMoreResult.group.messages.pageInfo },
              },
            },
          });
        },
      });
    },
  }),
});


// In update, we first retrieve the existing data for the query we want to update (GROUP_QUERY)
// along with the specific variables we passed to that query.
// This data comes to us from our Redux store of Apollo data.
// We check to see if the new Message returned from createMessage already exists
// (in case of race conditions down the line),
// and then update the previous query result by sticking the new message in front.
// We then use this modified data object and rewrite the results
// to the Apollo store with store.writeQuery, being sure to pass all the variables
// associated with our query. This will force props to change reference and
// the component to rerender.

// update will currently only update the query after the mutation succeeds
// and a response is sent back on the server. But we don’t want to wait till
// the server returns data...we crave instant gratification!
// If a user with shoddy internet tried to send a message and it didn’t show up right away,
// they’d probably try and send the message again and again and end up
// sending the message multiple times… and then they’d yell at customer support!
// Optimistic UI is our weapon for protecting customer support.
// We know the shape of the data we expect to receive from the server,
// so why not fake it until we get a response? react-apollo lets us accomplish this
// by adding an optimisticResponse parameter to mutate
const createMessageMutation = graphql(CREATE_MESSAGE_MUTATION, {
  props: ({ mutate }) => ({
    createMessage: ({ text, userId, groupId }) =>
      mutate({
        variables: { text, userId, groupId },
        optimisticResponse: {
          __typename: 'Mutation',
          createMessage: {
            __typename: 'Message',
            id: -1, // do not know id yet but it does not matter
            text, // we know that the text will be
            createdAt: new Date().toISOString(), // time = now
            from: {
              __typename: 'User',
              id: 1, // Still fake user
              username: 'Justyn.Kautzer',
            },
            to: {
              __typename: 'Group',
              id: groupId,
            },
          },
        },
        update: (store, { data: { createMessage } }) => {
          // Read data from our cache for this Query
          const groupData = store.readQuery({
            query: GROUP_QUERY,
            variables: {
              groupId,
              first: ITEMS_PER_PAGE,
            },
          });

          /* randomly buggy, error on function
          if (isDuplicateMessage(createMessage, groupData.group.messages)) {
            return groupData;
          }
          */
          // Add our message from the mutation to the end
          groupData.group.messages.edges.unshift({
            __typename: 'MessageEdge',
            node: createMessage,
            cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
          });

          // Write data back to the cache
          store.writeQuery({
            query: GROUP_QUERY,
            variables: {
              groupId,
              first: ITEMS_PER_PAGE,
            },
            data: groupData,
          });

          const userData = store.readQuery({
            query: USER_QUERY,
            variables: {
              id: 1, // fake user again
            },
          });

          // check if mutation is latest message and update cache
          const updatedGroup = _.find(userData.user.groups, { id: groupId });
          if (!updatedGroup.messages.edges.length ||
            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(createMessage.createdAt))) {
              // Update latest message
              updatedGroup.messages.edges[0] = {
                __typename: 'MessageEdge',
                node: createMessage,
                cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
              };

              // Write our data back to the cache
              store.writeQuery({
                query: USER_QUERY,
                variables: {
                  id: 1, // still fake user
                },
                data: userData,
              });
            }
        },
      }),
  }),
});

const updateGroupMutation = graphql(UPDATE_GROUP_MUTATION, {
  props: ({ mutate }) => ({
    updateGroup: group =>
      mutate({
        variables: { group },
        update: (store, { data: { updateGroup } }) => {
          // Read data from our cache for this query
          store.writeFragment({
            id: `Group:${updateGroup.id}`,
            fragment: gql`
              fragment group on Group {
                unreadCount
              }
            `,
            data: {
              __typename: 'Group',
              unreadCount: 0,
            },
          });
        },
      }),
  }),
});

export default compose(
  groupQuery,
  createMessageMutation,
  updateGroupMutation,
)(Messages);
