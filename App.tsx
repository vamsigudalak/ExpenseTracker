/* eslint-disable react-native/no-inline-styles */
/**
 * Refactored Expense Tracker screen
 * - Organized imports and helper utilities
 * - Kept all original functionality
 * - Removed commented/unused code and added clarifying comments
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated as RNAnimated,
  Easing,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

/* -------------------------------------------------------------------------- */
/* Optional native components fallbacks                                         */
/* -------------------------------------------------------------------------- */

/**
 * LinearGradientComp
 * - Use react-native-linear-gradient when available
 * - Fallback to a simple View with the first color as background
 */
let LinearGradientComp: any;
try {
  LinearGradientComp = require('react-native-linear-gradient').default;
} catch {
  LinearGradientComp = ({ children, style, colors }: any) => (
    <View style={[style, { backgroundColor: colors?.[0] || '#ccc' }]}>
      {children}
    </View>
  );
}

/**
 * SVG fallback
 * - Use react-native-svg when available
 * - Otherwise fall back to emoji icons in icon components
 */
let SvgComp: any;
let PathComp: any;
try {
  const RN_SVG = require('react-native-svg');
  SvgComp = RN_SVG.Svg || RN_SVG.default || RN_SVG;
  PathComp = RN_SVG.Path;
} catch {
  SvgComp = null;
  PathComp = null;
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type EntryType = 'income' | 'expense';

type BudgetItem = {
  id: string;
  title: string;
  amount: string; // raw numeric string
};

type InputRefsMap = Record<string, TextInput | null>;

type ChartItem = {
  id: string;
  title: string;
  value: number;
  percent: number;
  color: string;
};

type AnimatedBarProps = {
  width: number;
  color: string;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const COLORS: string[] = [
  '#ff6a6a',
  '#ab47bc',
  '#42a5f5',
  '#26c6da',
  '#66bb6a',
  '#ffa726',
];

const MAX_AMOUNT = 200000; // maximum allowed amount

/* -------------------------------------------------------------------------- */
/* Small reusable components                                                   */
/* -------------------------------------------------------------------------- */

/**
 * AmountInput
 * - Read-only formatted display for amounts (₹ prefix + localized number)
 * - Prevents keyboard from showing and cursor movement issues
 */
const AmountInput = React.forwardRef<
  TextInput,
  {
    value: string;
    style?: any;
    placeholder?: string;
  }
>(({ value, style, placeholder }, ref) => {
  const formatted = value ? `₹ ${Number(value).toLocaleString('en-IN')}` : '';

  return (
    <TextInput
      ref={ref}
      value={formatted}
      editable={false}
      showSoftInputOnFocus={false}
      placeholder={placeholder || '₹ 0'}
      style={style}
      pointerEvents="none"
    />
  );
});

/**
 * AnimatedBar
 * - Shows a horizontal bar with animated scaleX based on percent width
 * - Uses a small darken helper to create a two-tone gradient
 */
const AnimatedBar = ({ width, color }: AnimatedBarProps) => {
  const progress = useSharedValue<number>(0);

  useEffect(() => {
    progress.value = withTiming(width / 100, { duration: 700 });
  }, [progress, width]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const darken = (hex: string, amount = 20) => {
    const h = hex.replace('#', '');
    const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const secondColor = darken(color, 30);

  return (
    <Animated.View
      style={[
        style,
        {
          height: '100%',
          backgroundColor: color,
          transformOrigin: 'left',
        },
      ]}
    >
      <LinearGradientComp colors={[color, secondColor]} style={{ flex: 1 }} />
    </Animated.View>
  );
};

/* -------------------------------------------------------------------------- */
/* Icon components (SVG when available, emoji fallback otherwise)              */
/* -------------------------------------------------------------------------- */

const WalletIcon = ({
  size = 24,
  fill = '#fff',
}: {
  size?: number;
  fill?: string;
}) => {
  if (!SvgComp || !PathComp) return <Text style={{ color: fill }}>💼</Text>;
  return (
    <SvgComp width={size} height={size} viewBox="0 0 24 24">
      <PathComp
        d="M21 7H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"
        fill={fill}
      />
      <PathComp d="M21 7h-6v6h6V7z" fill="#fff" opacity="0.2" />
    </SvgComp>
  );
};

const PlusIcon = ({
  size = 18,
  color = '#000',
}: {
  size?: number;
  color?: string;
}) => {
  if (!SvgComp || !PathComp) return <Text style={{ color }}>＋</Text>;
  return (
    <SvgComp width={size} height={size} viewBox="0 0 24 24">
      <PathComp d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" fill={color} />
    </SvgComp>
  );
};

const TrashIcon = ({
  size = 10,
  color = '#000',
}: {
  size?: number;
  color?: string;
}) => {
  if (!SvgComp || !PathComp) return <Text style={{ color }}>🗑️</Text>;
  return (
    <SvgComp width={size} height={size} viewBox="0 0 24 24">
      <PathComp d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" fill={color} />
      <PathComp d="M9 4h6v2H9z" fill={color} />
    </SvgComp>
  );
};

/* -------------------------------------------------------------------------- */
/* Enable Android layout animations                                            */
/* -------------------------------------------------------------------------- */

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/* -------------------------------------------------------------------------- */
/* Main screen component                                                       */
/* -------------------------------------------------------------------------- */

const BudgetScreen: React.FC = () => {
  /* Splash animation refs and state */
  const splashScale = useRef(new RNAnimated.Value(0.7)).current;
  const splashOpacity = useRef(new RNAnimated.Value(1)).current;
  const [splashVisible, setSplashVisible] = useState(true);

  /* Data state */
  const [income, setIncome] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);

  /* Active input (mini-keypad) */
  const [activeInput, setActiveInput] = useState<{
    type: EntryType;
    id: string;
  } | null>(null);

  /* Refs for scrolling and focusing */
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRefs = useRef<InputRefsMap>({});

  /* Small animated values for press/balance effects */
  const scale = useSharedValue<number>(1);
  const balanceScale = useSharedValue<number>(1);

  /* Animated background driver */
  const animatedValue = useRef(new RNAnimated.Value(0)).current;

  /* ----------------------------- Helpers --------------------------------- */

  // Return true if any row is incomplete: missing title or missing/zero amount
  const hasEmptyRow = (list: BudgetItem[]) =>
    list.some(
      item => !item.title || !item.amount || Number(item.amount || 0) === 0,
    );

  /* ----------------------------- CRUD ops -------------------------------- */

  const addRow = (type: EntryType) => {
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      title: '',
      amount: '',
    };

    if (type === 'income') {
      if (hasEmptyRow(income)) return Alert.alert('Fill existing row');
      setIncome(prev => [...prev, newItem]);
    } else {
      if (hasEmptyRow(expenses)) return Alert.alert('Fill existing row');
      setExpenses(prev => [...prev, newItem]);
    }

    // Focus the new row's title and scroll to end
    setTimeout(() => {
      inputRefs.current[`${newItem.id}-title`]?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const deleteItem = (type: EntryType, id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (type === 'income') {
      setIncome(prev => prev.filter(i => i.id !== id));
    } else {
      setExpenses(prev => prev.filter(i => i.id !== id));
    }
  };

  const updateItem = (
    type: EntryType,
    id: string,
    field: keyof BudgetItem,
    value: string,
  ) => {
    const updater = (list: BudgetItem[]) =>
      list.map(item => (item.id === id ? { ...item, [field]: value } : item));

    if (type === 'income') {
      setIncome(prev => updater(prev));
    } else {
      setExpenses(prev => updater(prev));
    }
  };

  /* ------------------------- Mini keypad handlers ------------------------ */

  const handleNumberPress = (num: string) => {
    if (!activeInput) return;

    const list = activeInput.type === 'income' ? income : expenses;
    const item = list.find(i => i.id === activeInput.id);
    if (!item) return;

    const current = item.amount || '';
    const updated = current + num;

    if (Number(updated) > MAX_AMOUNT) {
      return Alert.alert(
        'Maximum amount is ₹' + MAX_AMOUNT.toLocaleString('en-IN'),
      );
    }

    updateItem(activeInput.type, activeInput.id, 'amount', updated);
  };

  const handleDelete = () => {
    if (!activeInput) return;

    const list = activeInput.type === 'income' ? income : expenses;
    const item = list.find(i => i.id === activeInput.id);
    if (!item) return;

    const updated = item.amount.slice(0, -1);
    updateItem(activeInput.type, activeInput.id, 'amount', updated);
  };

  /* ------------------------- Totals & balance --------------------------- */

  const totalIncome = useMemo<number>(
    () => income.reduce((s, i) => s + Number(i.amount || 0), 0),
    [income],
  );

  const totalExpenses = useMemo<number>(
    () => expenses.reduce((s, i) => s + Number(i.amount || 0), 0),
    [expenses],
  );

  const balance = totalIncome - totalExpenses;

  /* --------------------------- Animations -------------------------------- */

  // Press animation style for Add button
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Balance pulse animation
  const balanceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  // Looping animated background driver
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(animatedValue, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        RNAnimated.timing(animatedValue, {
          toValue: 0,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [animatedValue]);

  // Pulse balance when value changes
  useEffect(() => {
    balanceScale.value = withTiming(1.1, { duration: 300 }, () => {
      balanceScale.value = withTiming(1);
    });
  }, [balance, balanceScale]);

  // Splash entrance/exit animations
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(splashOpacity, {
        toValue: 0,
        delay: 4000, // splash stays longer before fading
        duration: 1500, // slower fade
        useNativeDriver: true,
      }),
      RNAnimated.spring(splashScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSplashVisible(false);
    });
  }, [splashOpacity, splashScale]);

  // Safety fade-out in case the parallel animation didn't run
  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.timing(splashOpacity, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, 700);
    return () => clearTimeout(t);
  }, [splashOpacity]);

  /* --------------------------- Persistence -------------------------------- */

  // Save to AsyncStorage after initial load
  useEffect(() => {
    if (!storageLoaded) {
      return;
    }
    AsyncStorage.setItem('DATA', JSON.stringify({ income, expenses }));
  }, [income, expenses, storageLoaded]);

  // Load from AsyncStorage once on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem('DATA');
        if (data) {
          const parsed = JSON.parse(data);
          setIncome(parsed.income || []);
          setExpenses(parsed.expenses || []);
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setStorageLoaded(true);
      }
    };
    loadData();
  }, []);

  /* --------------------------- Chart data --------------------------------- */

  const chartData = useMemo<ChartItem[]>(() => {
    const valid = expenses.filter(i => i.title && i.amount);
    if (!valid.length) return [];

    const parsed = valid.map((i, index) => ({
      id: i.id,
      title: i.title,
      value: Number(i.amount),
      color: COLORS[index % COLORS.length],
    }));

    const total = parsed.reduce((sum, i) => sum + i.value, 0);

    return parsed.map(i => ({
      ...i,
      percent: total > 0 ? i.value / total : 0,
    }));
  }, [expenses]);

  /* --------------------------- UI helpers --------------------------------- */

  const backgroundColor1 = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#1a237e', '#6a1b9a', '#004d40'],
  });

  const isActiveInput = (type: EntryType, id: string) =>
    activeInput?.type === type && activeInput?.id === id;

  /* --------------------------- Render ------------------------------------- */

  return (
    <SafeAreaProvider>
      <RNAnimated.View
        style={{
          flex: 1,
          backgroundColor: backgroundColor1,
        }}
      >
        <SafeAreaView style={styles.safe}>
          {/* Decorative background circles */}
          <View style={styles.bgCircle1} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />

          {/* Splash overlay */}
          {splashVisible && (
            <RNAnimated.View
              style={[
                styles.splashContainer,
                {
                  opacity: splashOpacity,
                },
              ]}
            >
              <LinearGradientComp
                colors={['#1a237e', '#8e24aa', '#00897b']}
                style={styles.splashGradient}
              >
                <RNAnimated.View
                  style={{
                    transform: [{ scale: splashScale }],
                    alignItems: 'center',
                  }}
                >
                  <Text style={styles.splashLogo}>💼</Text>
                  <Text style={styles.splashText}>Expense Tracker</Text>
                  <Text style={styles.splashSubText}>Track • Save • Grow</Text>
                </RNAnimated.View>
              </LinearGradientComp>
            </RNAnimated.View>
          )}

          {/* Header */}
          <LinearGradientComp
            colors={['#42a5f5', '#8e24aa']}
            style={styles.headerWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <WalletIcon />
            <Text style={styles.headerText}>Expense Tracker</Text>
          </LinearGradientComp>

          <ScrollView ref={scrollRef} style={styles.container}>
            {/* Income card */}
            <Animated.View
              entering={FadeInDown}
              style={[styles.card, styles.income]}
            >
              <Text style={{ fontSize: 20, paddingVertical: 10 }}>
                💎 Money In
              </Text>

              {income.map(item => (
                <View key={item.id} style={styles.rowWrap}>
                  <View style={styles.row}>
                    <Text style={{ paddingVertical: 10 }}>💰</Text>

                    <TextInput
                      ref={ref => {
                        inputRefs.current[`${item.id}-title`] = ref;
                      }}
                      style={styles.input}
                      value={item.title}
                      onChangeText={t =>
                        updateItem('income', item.id, 'title', t)
                      }
                    />

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        if (!item.title) {
                          return Alert.alert('Please enter a title first');
                        }
                        setActiveInput({ type: 'income', id: item.id });
                      }}
                    >
                      <AmountInput
                        style={[
                          styles.amount,
                          {
                            opacity: item.title ? 1 : 0.6,
                            borderWidth: isActiveInput('income', item.id)
                              ? 2
                              : 0,
                            borderColor: '#42a5f5',
                            backgroundColor: isActiveInput('income', item.id)
                              ? '#e3f2fd'
                              : '#fff',
                            borderRadius: 8,
                          },
                        ]}
                        value={item.amount}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteItem('income', item.id)}
                    style={{ paddingLeft: 2 }}
                  >
                    <TrashIcon size={20} color="#b71c1c" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.footer}>
                <Animated.View style={pressStyle}>
                  <TouchableOpacity
                    onPressIn={() => (scale.value = withTiming(0.95))}
                    onPressOut={() => (scale.value = withTiming(1))}
                    onPress={() => addRow('income')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingTop: 10,
                    }}
                  >
                    <PlusIcon size={18} color="#2e7d32" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: '#2e7d32',
                        fontWeight: 'bold',
                      }}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Text
                  style={{
                    marginLeft: 8,
                    fontWeight: 'bold',
                    paddingTop: 10,
                    paddingHorizontal: 20,
                  }}
                >
                  ₹{totalIncome}
                </Text>
              </View>
            </Animated.View>

            {/* Expense card */}
            <Animated.View
              entering={FadeInDown}
              style={[styles.card, styles.expense]}
            >
              <Text style={{ fontSize: 20, paddingVertical: 10 }}>
                💳 Money Out
              </Text>

              {expenses.map(item => (
                <View key={item.id} style={styles.rowWrap}>
                  <View style={styles.row}>
                    <Text style={{ paddingVertical: 10 }}>💸</Text>

                    <TextInput
                      ref={ref => {
                        inputRefs.current[`${item.id}-title`] = ref;
                      }}
                      style={styles.input}
                      value={item.title}
                      onChangeText={t =>
                        updateItem('expense', item.id, 'title', t)
                      }
                    />

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        if (!item.title) {
                          return Alert.alert('Please enter a title first');
                        }
                        setActiveInput({ type: 'expense', id: item.id });
                      }}
                    >
                      <AmountInput
                        style={[
                          styles.amount,
                          {
                            opacity: item.title ? 1 : 0.6,
                            borderWidth: isActiveInput('expense', item.id)
                              ? 2
                              : 0,
                            borderColor: '#ef5350',
                            backgroundColor: isActiveInput('expense', item.id)
                              ? '#ffebee'
                              : '#fff',
                            borderRadius: 8,
                          },
                        ]}
                        value={item.amount}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteItem('expense', item.id)}
                    style={{ paddingLeft: 2 }}
                  >
                    <TrashIcon size={20} color="#b71c1c" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={() => addRow('expense')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 10,
                  }}
                >
                  <PlusIcon size={18} color="#b71c1c" />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: '#b71c1c',
                      fontWeight: 'bold',
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    marginLeft: 8,
                    fontWeight: 'bold',
                    paddingTop: 10,
                    paddingHorizontal: 20,
                  }}
                >
                  ₹{totalExpenses}
                </Text>
              </View>
            </Animated.View>

            {/* Balance card */}
            <Animated.View style={[styles.balanceCard, balanceStyle]}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceEmoji}>
                  {balance < 0 ? '😢' : '😊'}
                </Text>
                <Text style={styles.balanceTitle}>Current Balance</Text>
                <Text style={styles.balanceAmount}>
                  ₹{balance.toLocaleString('en-IN')}
                </Text>
              </View>
            </Animated.View>

            {/* Expense breakdown chart */}
            {chartData.length > 0 && (
              <Animated.View
                entering={FadeInDown}
                style={[styles.card, styles.breakdownCard]}
              >
                <View style={styles.chartHeader}>
                  <Text style={styles.chartHeaderTitle}>
                    📊 Expense Breakdown
                  </Text>
                  <Text style={styles.chartHeaderTotal}>
                    ₹{totalExpenses.toLocaleString('en-IN')}
                  </Text>
                </View>

                {chartData.map(item => (
                  <View key={item.id} style={styles.chartRow}>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.chartTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>

                    <View style={styles.barWrap}>
                      <AnimatedBar
                        width={Math.max(item.percent * 100, 4)}
                        color={item.color}
                      />
                    </View>

                    <Animated.View
                      entering={FadeInDown}
                      style={styles.percentWrap}
                    >
                      <Text style={styles.percentText}>
                        {Math.round(item.percent * 100)}%
                      </Text>
                    </Animated.View>
                  </View>
                ))}
              </Animated.View>
            )}
          </ScrollView>

          {/* Mini keypad shown when an amount field is active */}
          {activeInput && (
            <View style={styles.miniKeypad}>
              <TouchableOpacity
                style={styles.miniDoneKey}
                onPress={() => setActiveInput(null)}
              >
                <Text style={styles.miniKeyText}>✓</Text>
              </TouchableOpacity>

              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.miniKey}
                  onPress={() => handleNumberPress(num)}
                >
                  <Text style={styles.miniKeyText}>{num}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.miniDeleteKey}
                onPress={handleDelete}
              >
                <Text style={styles.miniKeyText}>⌫</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </RNAnimated.View>
    </SafeAreaProvider>
  );
};

export default BudgetScreen;

/* ----------------------------- Styles ------------------------------------- */

const styles = StyleSheet.create({
  bgCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff15',
    top: -40,
    right: -60,
  },

  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffffff10',
    bottom: 120,
    left: -50,
  },

  bgCircle3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff08',
    bottom: -20,
    right: 30,
  },
  safe: { flex: 1 },
  container: { padding: 16 },
  header: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 1,
    borderRadius: 12,
    marginBottom: 5,
    paddingHorizontal: 15,
  },
  headerText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    marginLeft: 20,
  },
  card: {
    padding: 15,
    borderRadius: 18,
    marginBottom: 15,
    elevation: 3,
  },
  income: { backgroundColor: '#e8f5e9' },
  expense: { backgroundColor: '#ffebee' },
  rowWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  input: { flex: 2, marginHorizontal: 10, paddingVertical: 0, padding: 0 },
  amount: {
    flex: 1,
    textAlign: 'right',
    minWidth: 50,
    // Android-specific alignment fixes
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingVertical: 0,
    height: 42,
  },
  // Splash styles
  splash: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: '#6a1b9a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashInner: { alignItems: 'center' },
  splashIcon: { fontSize: 48, color: '#fff' },
  splashTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 8 },
  // Chart / breakdown tweaks
  breakdownCard: {
    backgroundColor: '#e6f7fe',
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  balance: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 15,
  },
  balanceText: { fontSize: 30, fontWeight: '700', marginTop: 5 },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  chartTitle: { width: 120, fontWeight: '600', marginRight: 8 },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  chartHeaderTitle: { fontWeight: '700', fontSize: 20 },
  chartHeaderTotal: { fontWeight: '900', color: '#616161' },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  percentWrap: { width: 55, alignItems: 'flex-end' },
  percentText: {
    backgroundColor: '#e6f7fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
  },
  barWrap: {
    flex: 2,
    height: 12,
    backgroundColor: '#00000070',
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  balanceCard: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // pushes everything to right
  },

  balanceEmoji: {
    fontSize: 30,
    marginRight: 10,
  },

  balanceTitle: {
    fontSize: 16,
    color: '#616161',
    marginRight: 8,
  },

  balanceAmount: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  splashGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  splashLogo: {
    fontSize: 70,
  },

  splashText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 14,
  },

  splashSubText: {
    color: '#ffffffcc',
    fontSize: 16,
    marginTop: 8,
    letterSpacing: 1,
  },
  miniKeypad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',

    backgroundColor: '#000000ee',

    paddingVertical: 10,

    borderTopWidth: 1,
    borderTopColor: '#222',
  },

  miniKey: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  miniDoneKey: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  miniDeleteKey: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  miniKeyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
});
