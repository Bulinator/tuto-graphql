import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const styles = {
  list: {
    paddingVertical: 8,
  },
  itemContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: 'red',
    borderColor: 'black',
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 3,
    top: 3,
    width: 20,
  },
  itemImage: {
    borderRadius: 27,
    height: 54,
    width: 54,
  },
};

const LOGO_URL = 'https://www.shareicon.net/data/2016/08/01/640324_logo_512x512.png';

class SelectedUserListItem extends Component {
  constructor(props) {
    super(props);

    this.remove = this.remove.bind(this);
  }

  remove() {
    this.props.remove(this.props.user);
  }

  render() {
    const { username } = this.props.user;

    return (
      <View style={styles.itemContainer}>
        <Image
          style={styles.itemImage}
          source={{ uri: LOGO_URL }}
        />
        <TouchableOpacity onPress={this.remove} style={styles.itemIcon}>
          <FontAwesome name="times" size={16} color="white" />
        </TouchableOpacity>
        <Text>{username}</Text>
      </View>
    );
  }
}

SelectedUserListItem.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
  }),
  remove: PropTypes.func,
};

class SelectedUserList extends Component {
  constructor(props) {
    super(props);
    this.renderItem = this.renderItem.bind(this);
  }

  keyExtractor = item => item.id;

  renderItem({ item: user }) {
    return (
      <SelectedUserListItem user={user} remove={this.props.remove} />
    );
  }

  render() {
    return (
      <FlatList
        data={this.props.data}
        keyExtractor={this.keyExtractor}
        renderItem={this.renderItem}
        horizontal
        style={styles.list}
      />
    );
  }
}

SelectedUserList.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  remove: PropTypes.func,
};

export default SelectedUserList;
