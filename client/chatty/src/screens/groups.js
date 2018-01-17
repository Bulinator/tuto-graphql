import { _ } from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableHighlight,
  View,
  Image,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import { Icon } from 'react-native-elements';
import moment from 'moment';
import { USER_QUERY } from '../graphql/user.query';
import ColorHelpers from '../helpers/ColorHelpers';

const styles = {
  container: {
    backgroundColor: ColorHelpers.bgColor,
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
  groupTextContainer: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 6,
  },
  groupText: {
    color: '#8c8c8c',
  },
  groupImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  groupTitleContainer: {
    flexDirection: 'row',
  },
  groupLastUpdated: {
    flex: 0.3,
    color: '#8c8c8c',
    fontSize: 11,
    textAlign: 'right',
  },
  groupUsername: {
    paddingVertical: 4,
  },
  warning: {
    textAlign: 'center',
    padding: 12,
  },
};

const fakeData = () => _.times(100, i => ({
  id: i,
  name: `Group ${i}`,
}));

// format createdAt with moment
const formatCreatedAt = createdAt => moment(createdAt).calendar(null, {
  sameDay: '[Today]',
  nextDay: '[Tomorrow]',
  nextWeek: 'dddd',
  lastDay: '[Yesterday]',
  lastWeek: 'dddd',
  sameElse: 'DD/MM/YYYY',
});

const LOGO_URL = 'https://www.shareicon.net/data/2016/08/01/640324_logo_512x512.png';
// We will fake sign in for now
let IS_SIGNED_IN = false;

class Group extends Component {
  constructor(props) {
    super(props);

    this.goToMessages = this.props.goToMessages.bind(this, this.props.group);
  }
  render() {
    const { id, name, messages } = this.props.group;
    return (
      <TouchableHighlight
        key={id}
        onPress={this.goToMessages}
      >
        <View style={styles.groupContainer}>
          <Image
            style={styles.groupImage}
            source={{ uri: LOGO_URL }}
          />

          <View style={styles.groupTextContainer}>
            <View style={styles.groupTitleContainer}>
              <Text style={styles.groupName}>{`${name}`}</Text>
              <Text style={styles.groupLastUpdated}>
                {messages.edges.length ?
                  formatCreatedAt(messages.edges[0].node.createdAt) : ''}
              </Text>
            </View>
            <Text style={styles.groupUsername}>
              {messages.edges.length ?
                `${messages.edges[0].node.from.username}:` : ''}
            </Text>
            <Text style={styles.groupText} numberOfLines={1}>
              {messages.edges.length ? messages.edges[0].node.text : ''}
            </Text>
          </View>
          <Icon
            name="angle-right"
            color={'#8c8c8c'}
            type="font-awesome"
            size={24}
          />
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
  messages: PropTypes.shape({
    edges: PropTypes.arrayOf(PropTypes.shape({
      cursor: PropTypes.string,
      node: PropTypes.object,
    })),
  }),
};

class Groups extends Component {
  static navigationOptions = ({ navigation }) => ({
    title: 'Chats Dev App',
    headerStyle: {
      marginTop: (Platform.OS === 'android') ? 24 : 0,
      backgroundColor: ColorHelpers.bgHeaderColor,
      paddingRight: 5,
    },
    headerTitleStyle: {
      alignSelf: 'flex-start',
      color: ColorHelpers.txtHeaderColor,
    },
    headerRight:
      <Icon
        name="plus-square-o"
        color={'#fff'}
        type='font-awesome'
        onPress={() => navigation.navigate('NewGroup')}
      />,
  });

  constructor(props) {
    super(props);
    this.goToMessages = this.goToMessages.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
  }

  onRefresh() {
    this.props.refetch();
    // faking unauthorized status
  }

  componentDidMount() {
    if (!IS_SIGNED_IN) {
      IS_SIGNED_IN = true;
      const { navigate } = this.props.navigation;
      navigate('Signin');
    }
  }

  keyExtractor = item => item.id;

  goToMessages(group) {
    const { navigate } = this.props.navigation;
    // groupId and title will attach to
    // props.navigation.state.paramas in Message
    navigate('Messages', { groupId: group.id, title: group.name });
  }

  renderSeparator = () => {
    return (
      <View
        style={{
          height: 1,
          backgroundColor: 'red',
        }}
      />
    );
  };

  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />

  render() {
    const { loading, user, networkStatus } = this.props;
    // render loading placeholder while we fetch messages
    if (loading || !user) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    if (user && !user.groups.length) {
      return (
        <View style={styles.container}>
          <Text style={styles.warning}>You do not have any groups.</Text>
        </View>
      );
    }

    // render list og groups for user
    // networkStatus == 4 means data are still loading
    return (
      <View style={styles.container}>
        <FlatList
          data={user.groups}
          keyExtractor={this.keyExtractor}
          ItemSeparatorComponent={this.renderSeparator}
          renderItem={this.renderItem}
          onRefresh={this.onRefresh}
          refreshing={networkStatus === 4}
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
  networkStatus: PropTypes.number,
  refetch: PropTypes.func,
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
  skip: ownProps => true, // fake it -- we'll use ownProps with auth
  options: () => ({ variables: { id: 1 } }), // fake user for now
  props: ({ data: { loading, networkStatus, refetch, user } }) => ({
    loading, networkStatus, refetch, user,
  }),
});

const componentWithData = compose(userQuery)(Groups);

export default componentWithData;
