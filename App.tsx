/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
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

const COLORS = {
  bg: '#f4f6f8',
  income: '#e8f5e9',
  expense: '#ffebee',
  card: '#ffffff',
  primary: '#1976d2',
  green: '#2e7d32',
  red: '#d32f2f',
};

const BAR_COLORS = [
  '#ef5350',
  '#ab47bc',
  '#5c6bc0',
  '#29b6f6',
  '#66bb6a',
  '#ffa726',
  '#8d6e63',
];

// ✅ OUTSIDE component
const AnimatedBar = ({ width, color }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(width, { duration: 600 });
  }, [width]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />
  );
};

const BudgetScreen = () => {
  const [income, setIncome] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);
  const scrollRef = useRef<any>(null);

  const hasEmptyRow = (list: BudgetItem[]) => {
    return list.some(item => !item.title.trim() && !item.amount);
  };

  // ✅ ADD ROW
  const addRow = (type: EntryType) => {
    if (type === 'income') {
      if (hasEmptyRow(income)) {
        Alert.alert('Finish entry', 'Please fill existing empty row first');
        return;
      }

      setIncome([
        ...income,
        { id: Date.now().toString(), title: '', amount: '' },
      ]);
    } else {
      if (hasEmptyRow(expenses)) {
        Alert.alert('Finish entry', 'Please fill existing empty row first');
        return;
      }

      setExpenses([
        ...expenses,
        { id: Date.now().toString(), title: '', amount: '' },
      ]);
    }
  };

  // ✅ DELETE
  const deleteItem = (type: EntryType, id: string) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: () => {
          if (type === 'income') {
            setIncome(income.filter(i => i.id !== id));
          } else {
            setExpenses(expenses.filter(i => i.id !== id));
          }
        },
      },
    ]);
  };

  // ✅ UPDATE
  const updateItem = (
    type: EntryType,
    id: string,
    field: 'title' | 'amount',
    value: string,
  ) => {
    const updater = (list: BudgetItem[]) =>
      list.map(i => (i.id === id ? { ...i, [field]: value } : i));

    type === 'income'
      ? setIncome(updater(income))
      : setExpenses(updater(expenses));
  };

  // ✅ FORMAT
  const formatCurrency = (val: string) => {
    if (!val) return '';
    return Number(val).toLocaleString('en-IN');
  };

  // ✅ TOTALS
  const totalIncome = useMemo(
    () => income.reduce((s, i) => s + Number(i.amount || 0), 0),
    [income],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, i) => s + Number(i.amount || 0), 0),
    [expenses],
  );

  const balance = totalIncome - totalExpenses;
  const isNegative = balance < 0;

  // ✅ STORAGE
  useEffect(() => {
    AsyncStorage.setItem('DATA', JSON.stringify({ income, expenses }));
  }, [income, expenses]);

  useEffect(() => {
    AsyncStorage.getItem('DATA').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setIncome(parsed.income || []);
        setExpenses(parsed.expenses || []);
      }
    });
  }, []);

  const validExpenses = expenses.filter(
    item => item.title.trim() && item.amount,
  );
  // ✅ CHART DATA
  const chartData = useMemo(() => {
    const cleaned = expenses
      .filter(item => item.title.trim() && item.amount)
      .map((i, index) => ({
        ...i,
        value: Number(i.amount.replace(/,/g, '')),
        color: BAR_COLORS[index % BAR_COLORS.length], // 👈 unique color
      }));

    if (cleaned.length === 0) return [];

    const max = Math.max(...cleaned.map(i => i.value), 1);

    return cleaned.map(i => ({
      ...i,
      width: (i.value / max) * 100,
    }));
  }, [expenses]);

  // ✅ ANIMATED BAR

  // ✅ ROW
  const renderRow = (item: BudgetItem, type: EntryType) => (
    <Animated.View
      key={item.id} // 👈 ADD THIS
      entering={FadeInDown}
      style={styles.rowWrap}
    >
      <View style={styles.row}>
        <Text>{type === 'income' ? '💰' : '💸'}</Text>

        <TextInput
          placeholder={type === 'income' ? 'Add Income' : 'Add Expense'}
          style={styles.input}
          value={item.title}
          onChangeText={t => updateItem(type, item.id, 'title', t)}
        />

        <Text>₹</Text>

        <TextInput
          keyboardType="numeric"
          style={[
            styles.amount,
            !item.title.trim() && { opacity: 0.4 }, // 👈 visually disabled
          ]}
          editable={!!item.title.trim()} // 👈 restrict typing
          placeholder={item.title ? '' : 'Enter title first'}
          value={formatCurrency(item.amount)}
          onChangeText={t =>
            updateItem(type, item.id, 'amount', t.replace(/\D/g, ''))
          }
        />
      </View>

      <TouchableOpacity onPress={() => deleteItem(type, item.id)}>
        <Text style={{ fontSize: 18 }}>🗑️</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.header}>💸 Expense Tracker</Text>

        <ScrollView ref={scrollRef} style={styles.container}>
          {/* INCOME */}
          <View style={[styles.card, { backgroundColor: COLORS.income }]}>
            <Text style={styles.title}>💎 Money In</Text>
            {income.map(item => renderRow(item, 'income'))}
            <View style={styles.footer}>
              <Text onPress={() => addRow('income')}>➕ Add</Text>
              <Text>₹{totalIncome}</Text>
            </View>
          </View>

          {/* EXPENSE */}
          <View style={[styles.card, { backgroundColor: COLORS.expense }]}>
            <Text style={styles.title}>💳 Money Out</Text>
            {expenses.map(item => renderRow(item, 'expense'))}

            <View style={styles.footer}>
              <Text onPress={() => addRow('expense')}>➕ Add</Text>
              <Text>₹{totalExpenses}</Text>
            </View>
          </View>

          {/* BALANCE */}
          <View style={styles.balance}>
            <Text>{isNegative ? '😢' : '😊'} Balance</Text>
            <Text style={{ fontSize: 24, color: isNegative ? 'red' : 'green' }}>
              ₹{balance}
            </Text>
          </View>

          {/* CHART */}
          {validExpenses.length > 0 && (
            <View style={styles.card}>
              {chartData.length > 0 && (
                <View style={styles.card}>
                  <Text>📊 Expense Breakdown</Text>

                  {chartData.map(item => (
                    <View
                      key={`${item.id}-${item.width}`}
                      style={styles.chartRow}
                    >
                      <Text style={{ flex: 1 }}>{item.title}</Text>

                      <View style={styles.barWrap}>
                        <AnimatedBar width={item.width} color={item.color} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
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

  header: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 10,
  },

  card: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  title: {
    fontWeight: 'bold',
    marginBottom: 10,
  },

  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
  },

  input: { flex: 2, marginHorizontal: 5 },
  amount: { width: 60, textAlign: 'right' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  balance: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 15,
    marginBottom: 15,
  },

  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },

  barWrap: {
    flex: 2,
    height: 10,
    backgroundColor: '#eee',
    marginHorizontal: 5,
    borderRadius: 10,
  },

  bar: {
    height: 10,
    borderRadius: 10,
  },
});
