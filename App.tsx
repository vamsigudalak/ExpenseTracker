import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';

type EntryType = 'income' | 'expense';

type BudgetItem = {
  id: string;
  title: string;
  amount: string;
};

const initialIncome: BudgetItem[] = [
  { id: '1', title: 'Salary', amount: '110000' },
];

const initialExpenses: BudgetItem[] = [
  { id: '1', title: 'Gold', amount: '2000' },
];

const BudgetScreen = () => {
  const [income, setIncome] = useState<BudgetItem[]>(initialIncome);
  const [expenses, setExpenses] = useState<BudgetItem[]>(initialExpenses);

  const addRow = (type: EntryType) => {
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      title: '',
      amount: '',
    };

    if (type === 'income') {
      setIncome([...income, newItem]);
      return;
    }

    setExpenses([...expenses, newItem]);
  };

  const updateItem = (
    type: EntryType,
    id: string,
    field: keyof Pick<BudgetItem, 'title' | 'amount'>,
    value: string,
  ) => {
    const updater = (list: BudgetItem[]) =>
      list.map((item: BudgetItem) =>
        item.id === id ? { ...item, [field]: value } : item,
      );

    if (type === 'income') {
      setIncome(updater(income));
      return;
    }

    setExpenses(updater(expenses));
  };

  const totalIncome = useMemo(
    () => income.reduce((s, i) => s + Number(i.amount || 0), 0),
    [income],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, i) => s + Number(i.amount || 0), 0),
    [expenses],
  );

  const balance = totalIncome - totalExpenses;

  const renderRow = (item: BudgetItem, type: EntryType): React.ReactElement => (
    <Animated.View entering={FadeInDown} style={styles.rowCard}>
      <Ionicons
        name={type === 'income' ? 'cash-outline' : 'card-outline'}
        size={22}
        color={type === 'income' ? 'green' : 'red'}
      />

      <TextInput
        placeholder="Title"
        style={styles.input}
        value={item.title}
        onChangeText={text => updateItem(type, item.id, 'title', text)}
      />

      <TextInput
        placeholder="₹"
        keyboardType="numeric"
        style={styles.amount}
        value={item.amount}
        onChangeText={text => updateItem(type, item.id, 'amount', text)}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* MONEY IN */}
      <View style={[styles.card, styles.incomeCard]}>
        <Text style={styles.title}>💰 Money In</Text>

        <FlatList
          data={income}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderRow(item, 'income')}
        />

        <TouchableOpacity onPress={() => addRow('income')}>
          <Text style={styles.addBtn}>+ Add Income</Text>
        </TouchableOpacity>

        <Text style={styles.total}>₹{totalIncome}</Text>
      </View>

      {/* MONEY OUT */}
      <View style={[styles.card, styles.expenseCard]}>
        <Text style={styles.title}>💸 Money Out</Text>

        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderRow(item, 'expense')}
        />

        <TouchableOpacity onPress={() => addRow('expense')}>
          <Text style={styles.addBtn}>+ Add Expense</Text>
        </TouchableOpacity>

        <Text style={styles.total}>₹{totalExpenses}</Text>
      </View>

      {/* BALANCE */}
      <View style={[styles.balanceCard]}>
        <Text style={styles.balanceTitle}>💎 Money Left</Text>
        <Text style={styles.balance}>₹{balance}</Text>
      </View>
    </View>
  );
};

export default BudgetScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },

  incomeCard: {
    backgroundColor: '#e8f5e9',
  },

  expenseCard: {
    backgroundColor: '#ffebee',
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    elevation: 2,
  },

  input: {
    flex: 2,
    marginHorizontal: 8,
  },

  amount: {
    flex: 1,
    textAlign: 'right',
  },

  addBtn: {
    color: '#007bff',
    marginTop: 10,
  },

  total: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },

  balanceCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
  },

  balanceTitle: {
    fontSize: 16,
    marginBottom: 5,
  },

  balance: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1565c0',
  },
});
