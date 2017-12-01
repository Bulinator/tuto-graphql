import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  ActivityIndicator,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import { NavigationActions } from 'react-navigation';
import { Button } from 'react-native-elements';

import GROUP_QUERY from '../graphql/group.query';
import USER_QUERY from '../graphql/user.query';
import LEAVE_GROUP_MUTATION from '../graphql/leave-group.mutation';
import DELETE_GROUP_MUTATION from '../graphql/delete-group.mutation';
import UPDATE_GROUP_MUTATION from '../graphql/update-group.mutation';

import ColorHelpers from '../helpers/ColorHelpers';

const resetAction = NavigationActions.reset({
  index: 0,
  actions: [
    NavigationActions.navigate({ routeName: 'Main' }),
  ],
});

const styles = {
  container: {
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupImageContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 6,
    alignItems: 'center',
  },
  groupName: {
    color: 'black',
  },
  groupNameBorder: {
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    borderTopWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  groupImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  participants: {
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#dbdbdb',
    color: '#777',
  },
  user: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    flexDirection: 'row',
    padding: 10,
  },
  username: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
};

const LOGO_URL = 'https://www.shareicon.net/data/2016/08/01/640324_logo_512x512.png';

class GroupDetails extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: `${navigation.state.params.title}`,
      headerStyle: {
        marginTop: (Platform.OS === 'android') ? 24 : 0,
        backgroundColor: ColorHelpers.bgHeaderColor,
        paddingRight: 5,
      },
      headerTitleStyle: {
        alignSelf: 'flex-start',
        color: ColorHelpers.txtHeaderColor,
      },
      headerRight: (
        isReady ? <Button
          title="Done"
          onPress={state.params.updateGroup}
        /> : undefined
      ),
    };
  };

  constructor(props) {
    super(props);
    this.state = {};

    this.cancel = this.cancel.bind(this);
    this.refreshNavigation = this.refreshNavigation.bind(this);
    this.headerComponent = this.headerComponent.bind(this);
    this.deleteGroup = this.deleteGroup.bind(this);
    this.leaveGroup = this.leaveGroup.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.updateGroup = this.updateGroup.bind(this);
  }


  componentWillUpdate(nextProps, nextState) {
    if (!!this.state.name !== !!nextState.name) {
      this.refreshNavigation(nextProps, nextState);
    }
  }

  refreshNavigation(props, state) {
    const { navigation, group } = props;
    navigation.setParams({
      mode: (state.name && group.name !== state.name) ? 'ready' : undefined,
      updateGroup: this.updateGroup,
      cancel: this.cancel,
    });
  }

  // reset state
  cancel() {
    this.setState({
      name: null,
      updating: false,
    });
  }

  deleteGroup() {
    this.props.deleteGroup(this.props.navigation.state.params.id)
      .then(() => {
        this.props.navigation.dispatch(resetAction);
      })
      .catch((e) => {
        console.log('Error on delete group: ', e);
      });
  }

  leaveGroup() {
    this.props.leaveGroup({
      id: this.props.navigation.state.params.id,
      userId: 1, // Fake user again
    }).then(() => {
      this.props.navigation.dispatch(resetAction);
    }).catch((e) => {
      console.log('leave group error: ', e);
    });
  }

  updateGroup() {
    const { id } = this.props.group;
    const { name } = this.state;
    //this.setState({ updating: true });
    this.props.updateGroup({ id, name });
  }

  headerComponent() {
    const { group } = this.props;

    return (
      <View>
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.groupImageContainer}>
            <Image
              style={styles.groupImage}
              source={{ uri: LOGO_URL }}
            />
            <Text>edit</Text>
          </TouchableOpacity>
          <View style={styles.groupNameBorder}>
            <TextInput
              onChangeText={name => this.setState({ name })}
              placeholder={group.name}
              style={styles.groupName}
              defaultValue={group.name}
            />
          </View>
        </View>
        <Text style={styles.participants}>
          {`participants: ${group.users.length}`.toUpperCase()}
        </Text>
      </View>
    );
  }

  keyExtractor = item => item.id;

  renderItem = ({ item: user }) => (
    <View style={styles.user}>
      <Image
        style={styles.avatar}
        source={{ uri: LOGO_URL }}
      />
      <Text style={styles.username}>{user.username}</Text>
    </View>
  );

  render() {
    const { group, loading } = this.props;

    // render loading while we fetch mesages
    if (!group || loading) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <FlatList
          data={group.users}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderItem}
          ListHeaderComponent={this.headerComponent}
          ListFooterComponent={() => (
            <View>
              <Button title="Leave Group" onPress={this.leaveGroup} />
              <Button title="Delete Group" onPress={this.deleteGroup} />
            </View>
          )}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        />
      </View>
    );
  }
}

GroupDetails.propTypes = {
  loading: PropTypes.bool,
  group: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    users: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      username: PropTypes.string,
    })),
  }),
  navigation: PropTypes.shape({
    dispatch: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        title: PropTypes.string,
        id: PropTypes.number,
      }),
    }),
  }),
  deleteGroup: PropTypes.func.isRequired,
  leaveGroup: PropTypes.func.isRequired,
  updateGroup: PropTypes.func,
};

const groupQuery = graphql(GROUP_QUERY, {
  options: ownProps => ({ variables: { groupId: ownProps.navigation.state.params.id } }),
  props: ({ data: { loading, group } }) => ({
    loading,
    group,
  }),
});

const deleteGroupMutation = graphql(DELETE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    deleteGroup: id =>
      mutate({
        variables: { id },
        update: (store, { data: { deleteGroup } }) => {
          // Read the data from our cache for this query.
          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now

          // Add our message from the mutation to the end.
          data.user.groups = data.user.groups.filter(g => deleteGroup.id !== g.id);

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: 1 }, // fake for now
            data,
          });
        }
      })
  })
});

const leaveGroupMutation = graphql(LEAVE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    leaveGroup: ({ id, userId }) =>
      mutate({
        variables: { id, userId },
        update: (store, { data: { leaveGroup } }) => {
          // Read data from cache for this query
          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } });

          // Add our message from the mutation to the end
          data.user.groups = data.user.groups.filter(g => leaveGroup.id !== g.id);

          // Write data
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: 1 }, // fake again
            data,
          });
        },
      }),
  }),
});

const updateGroupMutation = graphql(UPDATE_GROUP_MUTATION, {
  props: ({ mutate }) => ({
    updateGroup: group =>
      mutate({
        variables: { group },
      }),
  }),
});

export default compose(
  groupQuery,
  leaveGroupMutation,
  deleteGroupMutation,
  updateGroupMutation,
)(GroupDetails);
