import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployees, hasEvaluationForDate, getForemanName } from '../storage/database';
import { getTodayString, formatDisplayDate } from '../utils/dateUtils';

export default function HomeScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [evaluatedToday, setEvaluatedToday] = useState({});
  const [foremanName, setForemanName] = useState('');
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const emps = await getEmployees();
      setEmployees(emps);

      const name = await getForemanName();
      setForemanName(name);

      const evaluated = {};
      for (const emp of emps) {
        evaluated[emp.id] = await hasEvaluationForDate(emp.id, today);
      }
      setEvaluatedToday(evaluated);
    } catch (e) {
      Alert.alert('Error', 'Failed to load data.');
    }
  }

  function renderEmployee({ item }) {
    const hasEval = evaluatedToday[item.id];
    return (
      <TouchableOpacity
        style={styles.employeeCard}
        onPress={() => navigation.navigate('Evaluate', { employee: item })}
      >
        <View style={styles.cardLeft}>
          {item.photo_uri ? (
            <Image source={{ uri: item.photo_uri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={28} color="#fff" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.evalStatus}>
              {hasEval ? 'Rated today' : 'Not yet rated'}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {hasEval ? (
            <Ionicons name="checkmark-circle" size={24} color="#2d7d46" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#ccc" />
          )}
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {foremanName || 'Foreman'}</Text>
          <Text style={styles.date}>{formatDisplayDate(today)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEmployee')}
        >
          <Ionicons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{employees.length}</Text>
          <Text style={styles.summaryLabel}>Employees</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {Object.values(evaluatedToday).filter(Boolean).length}
          </Text>
          <Text style={styles.summaryLabel}>Rated Today</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {employees.length - Object.values(evaluatedToday).filter(Boolean).length}
          </Text>
          <Text style={styles.summaryLabel}>Remaining</Text>
        </View>
      </View>

      {employees.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Employees Yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button above to add your first crew member.
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployee}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B3A5C',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  date: {
    fontSize: 14,
    color: '#a0c4e8',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2d7d46',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3A5C',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a0c4e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  evalStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
