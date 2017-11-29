import { _ } from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableHighlight,
  View,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import { USER_QUERY } from '../graphql/user.query';

const styles = {
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
  loading: {
    justifyContent: 'center',
    flex: 1,
  },
  groupContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupName: {
    fontWeight: 'bold',
    flex: 0.7,
  },
};

const fakeData = () => _.times(100, i => ({
  id: i,
  name: `Group ${i}`,
}));

class Group extends Component {
  constructor(props) {
    super(props);

    this.goToMessages = this.props.goToMessages.bind(this, this.props.group);
  }
  render() {
    const { id, name } = this.props.group;
    return (
      <TouchableHighlight
        key={id}
        onPress={this.goToMessages}
      >
        <View style={styles.groupContainer}>
          <Text style={styles.groupName}>{`${name}`}</Text>
        </View>
      </TouchableHighlight>
    );
  }
}

Group.propTypes = {
  goToMessages: PropTypes.func.isRequired,
  group: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  }),
};

class Groups extends Component {
  static navigationOptions = {
    title: 'Chats',
    headerStyle: { marginTop: (Platform.OS === 'android') ? 24 : 0 },
    headerTitleStyle: { alignSelf: 'center' },
  };

  constructor(props) {
    super(props);
    this.goToMessages = this.goToMessages.bind(this);
  }

  keyExtractor = item => item.id;

  goToMessages(group) {
    const { navigate } = this.props.navigation;
    // groupId and title will attach to
    // props.navigation.state.paramas in Message
    navigate('Messages', { groupId: group.id, title: group.name });
  }

  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />

  render() {
    const { loading, user } = this.props;
    // render loading placeholder while we fetch messages
    if (loading || !user) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    // render list og groups for user
    return (
      <View style={styles.container}>
        <FlatList
          data={user.groups}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderItem}
        />
      </View>
    );
  }
}

Groups.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
  loading: PropTypes.bool,
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
    groups: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })),
  }),
};

const userQuery = graphql(USER_QUERY, {
  options: () => ({ variables: { id: 1 } }), // fake user for now
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

const componentWithData = compose(userQuery)(Groups);

export default componentWithData;
