import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  TextInput,
  View,
} from 'react-native';
import { Icon } from 'react-native-elements';

const styles = {
  container: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    borderColor: '#dbdbdb',
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  inputContainer: {
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingLeft: 5,
  },
  input: {
    backgroundColor: 'white',
    borderColor: '#D4D4D4',
    borderRadius: 15,
    borderWidth: 1,
    color: 'black',
    height: 35,
    marginTop: 2,
    paddingHorizontal: 10,
  },
  sendButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    height: 20,
    width: 20,
    backgroundColor: '#128C7E',
  },
  iconStyle: {
    marginRight: 0, // default is 12
  },
};

const sendButton = send => (
  <Icon
    raised
    reverse
    name="send"
    type="font-awesome"
    color="#128C7E"
    size={16}
    onPress={send}
  />
);

class MessageInput extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.send = this.send.bind(this);
  }

  onChangeText(text) {
    if (text.length > 0) {
      this.setState({
        canBeSend: true,
        text,
      });
    } else {
      this.setState({ canBeSend: false });
    }
  }

  send() {
    this.props.send(this.state.text);
    this.textInput.clear();
    this.textInput.blur();
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={(ref) => { this.textInput = ref; }}
            onChangeText={text => this.onChangeText(text)}
            style={styles.input}
            placeholder="Type your message here!"
            underlineColorAndroid="transparent"
          />
        </View>
        {this.state.canBeSend ?
          <View style={styles.sendButtonContainer}>
            {sendButton(this.send)}
          </View>
          : null
        }
      </View>
    );
  }
}

MessageInput.propTypes = {
  send: PropTypes.func.isRequired,
};

export default MessageInput;
