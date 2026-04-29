/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

type EntryType = 'income' | 'expense';

type BudgetItem = {
  id: string;
  title: string;
  amount: string;
};

type Selection = {
  start: number;
  end: number;
};

type SelectionMap = Record<string, Selection>;

type InputRefsMap = Record<string, TextInput | null>;

type GradientPair = [string, string];

type AnimatedBarProps = {
  width: number;
  colors: GradientPair;
};

type RowItemProps = {
  item: BudgetItem;
  type: EntryType;
  updateItem: (
    type: EntryType,
    id: string,
    field: keyof BudgetItem,
    value: string,
  ) => void;
  deleteItem: (type: EntryType, id: string) => void;
  selectionMap: SelectionMap;
  setSelectionMap: React.Dispatch<React.SetStateAction<SelectionMap>>;
  inputRefs: React.MutableRefObject<InputRefsMap>;
  formatCurrency: (val: string) => string;
};

type ChartItem = {
  id: string;
  title: string;
  value: number;
  color: GradientPair;
  percent: number;
};

const GRADIENTS: GradientPair[] = [
  ['#ff6a6a', '#ef5350'],
  ['#ab47bc', '#8e24aa'],
  ['#42a5f5', '#1e88e5'],
  ['#26c6da', '#00acc1'],
  ['#66bb6a', '#43a047'],
  ['#ffa726', '#fb8c00'],
];

const AnimatedBar = ({ width, colors }: AnimatedBarProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(width, { duration: 500 });
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Animated.View style={[animatedStyle, { height: '100%' }]}>
      <View
        style={{
          flex: 1,
          borderRadius: 10,
          backgroundColor: colors?.[0] || '#42a5f5',
        }}
      />
    </Animated.View>
  );
};

const RowItem = ({
  item,
  type,
  updateItem,
  deleteItem,
  selectionMap,
  setSelectionMap,
  inputRefs,
  formatCurrency,
}: RowItemProps) => {
  return (
    <Animated.View entering={FadeInDown} style={styles.rowWrap}>
      <View style={styles.row}>
        <Text>{type === 'income' ? '💰' : '💸'}</Text>

        <TextInput
          ref={ref => {
            inputRefs.current[item.id] = ref;
          }}
          placeholder={type === 'income' ? 'Add Income' : 'Add Expense'}
          style={styles.input}
          value={item.title}
          onChangeText={t => updateItem(type, item.id, 'title', t)}
        />

        <Text>₹</Text>

        <TextInput
          keyboardType="numeric"
          style={[styles.amount, !item.title && { opacity: 0.4 }]}
          editable={!!item.title}
          value={formatCurrency(item.amount)}
          selection={selectionMap[item.id] || { start: 0, end: 0 }}
          onChangeText={t => {
            const clean = t.replace(/\D/g, '');
            updateItem(type, item.id, 'amount', clean);

            const length = formatCurrency(clean).length;

            setSelectionMap(prev => ({
              ...prev,
              [item.id]: { start: length, end: length },
            }));
          }}
        />
      </View>

      <TouchableOpacity onPress={() => deleteItem(type, item.id)}>
        <Text style={{ fontSize: 18 }}>🗑️</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const BudgetScreen = () => {
  const [income, setIncome] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);
  const [selectionMap, setSelectionMap] = useState<SelectionMap>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRefs = useRef<InputRefsMap>({});

  const hasEmptyRow = (list: BudgetItem[]) =>
    list.some(item => !item.title && !item.amount);

  const addRow = (type: EntryType) => {
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      title: '',
      amount: '',
    };

    if (type === 'income') {
      if (hasEmptyRow(income)) return Alert.alert('Fill existing row');
      setIncome([...income, newItem]);
    } else {
      if (hasEmptyRow(expenses)) return Alert.alert('Fill existing row');
      setExpenses([...expenses, newItem]);
    }

    setTimeout(() => {
      inputRefs.current[newItem.id]?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const deleteItem = (type: EntryType, id: string) => {
    type === 'income'
      ? setIncome(income.filter(i => i.id !== id))
      : setExpenses(expenses.filter(i => i.id !== id));
  };

  const updateItem = (
    type: EntryType,
    id: string,
    field: keyof BudgetItem,
    value: string,
  ) => {
    const update = (list: BudgetItem[]) =>
      list.map(i => (i.id === id ? { ...i, [field]: value } : i));

    type === 'income'
      ? setIncome(update(income))
      : setExpenses(update(expenses));
  };

  const formatCurrency = (val: string) =>
    val ? Number(val).toLocaleString('en-IN') : '';

  const totalIncome = useMemo(
    () => income.reduce((s, i) => s + Number(i.amount || 0), 0),
    [income],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, i) => s + Number(i.amount || 0), 0),
    [expenses],
  );

  const balance = totalIncome - totalExpenses;

  useEffect(() => {
    AsyncStorage.setItem('DATA', JSON.stringify({ income, expenses }));
  }, [income, expenses]);

  useEffect(() => {
    AsyncStorage.getItem('DATA').then(d => {
      if (d) {
        const parsed = JSON.parse(d);
        setIncome(parsed.income || []);
        setExpenses(parsed.expenses || []);
      }
    });
  }, []);

  const chartData = useMemo<ChartItem[]>(() => {
    const validExpenses = expenses.filter(item => item.title.trim());

    if (validExpenses.length === 0) return [];

    const parsed: Omit<ChartItem, 'percent'>[] = validExpenses.map(
      (item, index) => ({
        id: item.id,
        title: item.title,
        value: Number(item.amount || 0),
        color: GRADIENTS[index % GRADIENTS.length],
      }),
    );

    const total = parsed.reduce((sum, item) => sum + item.value, 0);

    return parsed.map(item => ({
      ...item,
      percent: total > 0 ? item.value / total : 0,
    }));
  }, [expenses]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.header}>💸 Expense Tracker</Text>

        <ScrollView ref={scrollRef} style={styles.container}>
          {/* INCOME */}
          <View style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
            <Text>💎 Money In</Text>

            {income.map(item => (
              <RowItem
                key={item.id}
                item={item}
                type="income"
                updateItem={updateItem}
                deleteItem={deleteItem}
                selectionMap={selectionMap}
                setSelectionMap={setSelectionMap}
                inputRefs={inputRefs}
                formatCurrency={formatCurrency}
              />
            ))}

            <View style={styles.footer}>
              <Text onPress={() => addRow('income')}>➕ Add</Text>
              <Text>₹{totalIncome}</Text>
            </View>
          </View>

          {/* EXPENSE */}
          <View style={[styles.card, { backgroundColor: '#ffebee' }]}>
            <Text>💳 Money Out</Text>

            {expenses.map(item => (
              <RowItem
                key={item.id}
                item={item}
                type="expense"
                updateItem={updateItem}
                deleteItem={deleteItem}
                selectionMap={selectionMap}
                setSelectionMap={setSelectionMap}
                inputRefs={inputRefs}
                formatCurrency={formatCurrency}
              />
            ))}

            <View style={styles.footer}>
              <Text onPress={() => addRow('expense')}>➕ Add</Text>
              <Text>₹{totalExpenses}</Text>
            </View>
          </View>

          {/* BALANCE */}
          <View style={styles.balance}>
            <Text>{balance < 0 ? '😢' : '😊'} Balance</Text>
            <Text style={{ fontSize: 24 }}>
              ₹{balance.toLocaleString('en-IN')}
            </Text>
          </View>

          {chartData.length > 0 && (
            <View style={styles.card}>
              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                📊 Expense Breakdown
              </Text>

              {chartData.map(item => (
                <View key={item.id} style={styles.chartRow}>
                  {/* Title */}
                  <Text style={styles.chartTitle}>{item.title}</Text>

                  {/* Bar */}
                  <View style={styles.barWrap}>
                    <AnimatedBar
                      width={Math.max(item.percent * 100, 4)} // 👈 min width
                      colors={item.color}
                    />
                  </View>

                  {/* Percentage */}
                  <Text style={{ width: 40, textAlign: 'right' }}>
                    {Math.round(item.percent * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default BudgetScreen;

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { textAlign: 'center', fontSize: 22, fontWeight: 'bold' },
  card: { padding: 15, borderRadius: 15, marginBottom: 15 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
  },
  input: { flex: 2 },
  amount: { width: 60, textAlign: 'right' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  balance: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 15,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  chartTitle: { width: 80, flexShrink: 1 },
  barWrap: {
    flex: 2,
    height: 12,
    backgroundColor: '#eee',
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden', // ✅ MUST
  },
  bar: { height: '100%' },
});
