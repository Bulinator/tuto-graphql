import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Text,
  View,
  Platform,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import { NavigationActions } from 'react-navigation';
import update from 'immutability-helper';
import { Button } from 'react-native-elements';
import ColorHelpers from '../helpers/ColorHelpers';

import { USER_QUERY } from '../graphql/user.query';
import CREATE_GROUP_MUTATION from '../graphql/create-group.mutation';
import SelectedUserList from '../components/selected-user-list';

const styles = {
  container: {
    flex: 1,
    backgroundColor: ColorHelpers.bgColor,
  },
  detailsContainer: {
    padding: 20,
    flexDirection: 'row',
  },
  imageContainer: {
    paddingRight: 20,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  input: {
    color: 'black',
    height: 32,
  },
  inputBorder: {
    borderColor: '#dbdbdb',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  inputInstructions: {
    paddingTop: 6,
    color: '#777',
    fontSize: 12,
  },
  groupImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  selected: {
    flexDirection: 'row',
  },
  loading: {
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    color: 'blue',
    fontSize: 18,
    paddingTop: 2,
  },
  participants: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#dbdbdb',
    color: '#777',
  },
};

const LOGO_URL = 'https://www.shareicon.net/data/2016/08/01/640324_logo_512x512.png';

// Build navigation
const goToNewGroup = group => NavigationActions.reset({
  index: 1,
  actions: [
    NavigationActions.navigate({ routeName: 'Main' }),
    NavigationActions.navigate({ routeName: 'Messages', params: { groupId: group.id, title: group.name } }),
  ],
});

// helper function checks for duplicate groups, which we receive because we
// get subscription updates for our own groups as well.
// TODO it's pretty inefficient to scan all the groups every time.
// maybe only scan the first 10, or up to a certain timestamp
function isDuplicateGroup(newGroup, existingGroups) {
  return newGroup.id !== null && existingGroups.some(group => newGroup.id === group.id);
}

class FinalizeGroup extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: 'New Group',
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
          title="Create"
          onPress={state.params.create}
        /> : undefined
      ),
    };
  };

  constructor(props) {
    super(props);

    const { selected } = props.navigation.state.params;

    this.state = {
      selected,
    };

    this.create = this.create.bind(this);
    this.pop = this.pop.bind(this);
    this.remove = this.remove.bind(this);
  }

  componentDidMount() {
    this.refreshNavigation(this.state.selected.length && this.state.name);
  }

  componentWillUpdate(nextProps, nextState) {
    if ((nextState.selected.length && nextState.name) !==
      (this.state.selected.length && this.state.name)) {
      this.refreshNavigation(nextState.selected.length && nextState.name);
    }
  }

  pop() {
    this.props.navigation.goBack();
  }

  remove(user) {
    const index = this.state.selected.indexOf(user);
    if (~index) {
      const selected = update(this.state.selected, { $splice: [[index, 1]] });
      this.setState({
        selected,
      });
    }
  }

  create() {
    const { createGroup } = this.props;

    createGroup({
      name: this.state.name,
      userId: 1, // fake user for now
      userIds: _.map(this.state.selected, 'id'),
    }).then((res) => {
      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
    }).catch((error) => {
      Alert.alert(
        'Error Creating New Group',
        error.message,
        [
          { text: 'OK', onPress: () => {} },
        ],
      );
    });
  }

  refreshNavigation(ready) {
    const { navigation } = this.props;
    navigation.setParams({
      mode: ready ? 'ready' : undefined,
      create: this.create,
    });
  }

  render() {
    const { friendCount } = this.props.navigation.state.params;

    return (
      <View style={styles.container}>
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.imageContainer}>
            <Image
              style={styles.groupImage}
              source={{ uri: LOGO_URL }}
            />
            <Text>edit</Text>
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <View style={styles.inputBorder}>
              <TextInput
                autoFocus
                onChangeText={name => this.setState({ name })}
                placeholder="Group Subject"
                style={styles.input}
              />
            </View>
            <Text style={styles.inputInstructions}>
              {'Please provide a group subject and optional group icon'}
            </Text>
          </View>
        </View>
        <Text style={styles.participants}>
          {`participants: ${this.state.selected.length} of ${friendCount}`.toUpperCase()}
        </Text>
        <View style={styles.selected}>
          {this.state.selected.length ?
            <SelectedUserList
              data={this.state.selected}
              remove={this.remove}
            /> : undefined}
        </View>
      </View>
    );
  }
}

FinalizeGroup.propTypes = {
  createGroup: PropTypes.func.isRequired,
  navigation: PropTypes.shape({
    dispatch: PropTypes.func,
    goBack: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        friendCount: PropTypes.number.isRequired,
      }),
    }),
  }),
};

const createGroupMutation = graphql(CREATE_GROUP_MUTATION, {
  props: ({ mutate }) => ({
    createGroup: ({ name, userIds, userId }) =>
      mutate({
        variables: { name, userIds, userId },
        update: (store, { data: { createGroup } }) => {
          // Read data from cache for this query
          const data = store.readQuery({ query: USER_QUERY, variables: { id: userId } });

          if (isDuplicateGroup(createGroup, data.user.groups)) {
            return;
          }

          // Add our message from the mutation to the end
          data.user.groups.push(createGroup);

          // Write data back into the cache
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: userId },
            data,
          });
        },
      }),
  }),
});

const userQuery = graphql(USER_QUERY, {
  options: ownProps => ({
    variables: {
      id: ownProps.navigation.state.params.userId,
    },
  }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

export default compose(
  userQuery,
  createGroupMutation,
)(FinalizeGroup);
