import { _ } from 'lodash';
import {
  FlatList,
  View,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import randomColor from 'randomcolor';
import { graphql, compose } from 'react-apollo';

import Message from '../components/messages';
import MessageInput from '../components/messages-input';
import GROUP_QUERY from '../graphql/group.query';
import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';

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
};

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

function isDuplicateMessage(newMessage, existingMessages) {
  return newMessage.id !== null &&
    existingMessages.some(message => newMessage.id === message.id);
}

class Messages extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    return {
      title: state.params.title,
      headerStyle: {
        marginTop: (Platform.OS === 'android') ? 24 : 0,
        paddingRight: 45,
      },
      headerTitleStyle: { alignSelf: 'center' },
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      usernameColors: {},
    };

    this.send = this.send.bind(this);
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
      // update state
      this.setState({
        usernameColors,
      });
    }
  }

  keyExtractor = item => item.id;

  send(text) {
    this.props.createMessage({
      groupId: this.props.navigation.state.params.groupId,
      userId: 1, // fake user for now
      text,
    }).then(() => {
      this.flatList.scrollToEnd({ animated: true });
    });
  }

  renderItem = ({ item: message }) => (
    <Message
      color={this.state.usernameColors[message.from.username]}
      isCurrentUser={message.from.id === 1} // until we add auth
      message={message}
    />
  )

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
          keyboardVerticalOffset={64}
          style={styles.container}
        >
          <FlatList
            ref={(ref) => { this.flatList = ref; }}
            data={group.messages.slice().reverse()}
            keyExtractor={this.keyExtractor}
            renderItem={this.renderItem}
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
    state: PropTypes.shape({
      params: PropTypes.shape({
        groupId: PropTypes.number,
      }),
    }),
  }),
  group: PropTypes.shape({
    group: PropTypes.array,
    users: PropTypes.array,
  }),
  loading: PropTypes.bool,
};

const groupQuery = graphql(GROUP_QUERY, {
  options: ownProps => ({
    variables: {
      groupId: ownProps.navigation.state.params.groupId,
    },
  }),
  props: ({ data: { loading, group } }) => ({
    loading, group,
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
          const data = store.readQuery({
            query: GROUP_QUERY,
            variables: {
              groupId,
            },
          });

          if (isDuplicateMessage(createMessage, data.group.messages)) {
            return data;
          }

          // Add our message from the mutation to the end
          data.group.messages.unshift(createMessage);

          // Write data back to the cache
          store.writeQuery({
            query: GROUP_QUERY,
            variables: {
              groupId,
            },
            data,
          });
        },
      }),
  }),
});

export default compose(
  groupQuery,
  createMessageMutation,
)(Messages);
