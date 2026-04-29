declare module 'react-native-vector-icons/Ionicons' {
  import * as React from 'react';
  import { TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  const Ionicons: React.ComponentType<IconProps>;

  export default Ionicons;
}
