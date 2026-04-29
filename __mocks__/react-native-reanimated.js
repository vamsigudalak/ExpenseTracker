const React = require('react');
const {View} = require('react-native');

function AnimatedView(props) {
  return React.createElement(View, props, props.children);
}

const Animated = {
  View: AnimatedView,
  Text: AnimatedView,
};

module.exports = Animated;
module.exports.default = Animated;
module.exports.FadeInDown = {};