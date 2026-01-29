import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getForemanName,
  updateForemanName,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getRatingScale,
  updateRatingScale,
} from '../storage/database';

export default function SettingsScreen({ navigation }) {
  const [foremanName, setForemanName] = useState('');
  const [categories, setCategories] = useState([]);
  const [ratingScale, setRatingScale] = useState({ min_value: 1, max_value: 5, best_value: 5 });
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scaleModalVisible, setScaleModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [scaleMin, setScaleMin] = useState('1');
  const [scaleMax, setScaleMax] = useState('5');
  const [scaleBest, setScaleBest] = useState('5');
  const [nameEdited, setNameEdited] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  async function loadSettings() {
    try {
      const name = await getForemanName();
      setForemanName(name);

      const cats = await getCategories();
      setCategories(cats);

      const scale = await getRatingScale();
      setRatingScale(scale);
      setScaleMin(String(scale.min_value));
      setScaleMax(String(scale.max_value));
      setScaleBest(String(scale.best_value));
    } catch (e) {
      Alert.alert('Error', 'Failed to load settings.');
    }
  }

  async function handleSaveName() {
    if (!foremanName.trim()) {
      Alert.alert('Error', 'Foreman name cannot be empty.');
      return;
    }
    try {
      await updateForemanName(foremanName.trim());
      setNameEdited(false);
      Alert.alert('Saved', 'Foreman name updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update name.');
    }
  }

  function openAddCategory() {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryModalVisible(true);
  }

  function openEditCategory(cat) {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryModalVisible(true);
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryName.trim());
      } else {
        await addCategory(categoryName.trim());
      }
      setCategoryModalVisible(false);
      loadSettings();
    } catch (e) {
      Alert.alert('Error', 'Failed to save category.');
    }
  }

  function handleDeleteCategory(cat) {
    if (categories.length <= 1) {
      Alert.alert('Error', 'You must have at least one category.');
      return;
    }
    Alert.alert('Delete Category', `Remove "${cat.name}"? Existing ratings for this category will be preserved in reports.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
            loadSettings();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete category.');
          }
        },
      },
    ]);
  }

  async function handleSaveScale() {
    const min = parseInt(scaleMin, 10);
    const max = parseInt(scaleMax, 10);
    const best = parseInt(scaleBest, 10);

    if (isNaN(min) || isNaN(max) || isNaN(best)) {
      Alert.alert('Error', 'Please enter valid numbers.');
      return;
    }
    if (min >= max) {
      Alert.alert('Error', 'Minimum must be less than maximum.');
      return;
    }
    if (best < min || best > max) {
      Alert.alert('Error', 'Best value must be within the scale range.');
      return;
    }

    try {
      await updateRatingScale(min, max, best);
      setScaleModalVisible(false);
      loadSettings();
      Alert.alert('Saved', `Rating scale updated to ${min}-${max} (${best} = best).`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update scale.');
    }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Return to the login screen?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => navigation.getParent()?.replace('Login'),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Foreman Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foreman Information</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={foremanName}
            onChangeText={(text) => {
              setForemanName(text);
              setNameEdited(true);
            }}
            placeholder="Enter foreman name"
            placeholderTextColor="#999"
            autoCapitalize="words"
          />
          {nameEdited && (
            <TouchableOpacity style={styles.saveNameButton} onPress={handleSaveName}>
              <Text style={styles.saveNameText}>Save Name</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rating Scale */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating Scale</Text>
        <TouchableOpacity style={styles.card} onPress={() => setScaleModalVisible(true)}>
          <View style={styles.scaleRow}>
            <View>
              <Text style={styles.scaleLabel}>Current Scale</Text>
              <Text style={styles.scaleValue}>
                {ratingScale.min_value} to {ratingScale.max_value} ({ratingScale.best_value} = best)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rating Categories</Text>
          <TouchableOpacity style={styles.addCatButton} onPress={openAddCategory}>
            <Ionicons name="add-circle" size={28} color="#2d7d46" />
          </TouchableOpacity>
        </View>
        {categories.map((cat) => (
          <View key={cat.id} style={styles.categoryCard}>
            <TouchableOpacity style={styles.categoryInfo} onPress={() => openEditCategory(cat)}>
              <Ionicons name="reorder-three" size={22} color="#ccc" />
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
            <View style={styles.categoryActions}>
              <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.catAction}>
                <Ionicons name="create-outline" size={18} color="#1B3A5C" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.catAction}>
                <Ionicons name="trash-outline" size={18} color="#c0392b" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#c0392b" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Crew Performance Evaluator v1.0.0</Text>

      {/* Category edit modal */}
      <Modal visible={categoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Category name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveCategory}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scale edit modal */}
      <Modal visible={scaleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Customize Rating Scale</Text>
            <Text style={styles.scaleHint}>
              Set the minimum, maximum, and which value represents the best rating.
            </Text>

            <Text style={styles.label}>Minimum Value</Text>
            <TextInput
              style={styles.modalInput}
              value={scaleMin}
              onChangeText={setScaleMin}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Maximum Value</Text>
            <TextInput
              style={styles.modalInput}
              value={scaleMax}
              onChangeText={setScaleMax}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Best Value</Text>
            <TextInput
              style={styles.modalInput}
              value={scaleBest}
              onChangeText={setScaleBest}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setScaleModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveScale}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B3A5C',
    marginBottom: 10,
  },
  addCatButton: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  saveNameButton: {
    backgroundColor: '#1B3A5C',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleLabel: {
    fontSize: 13,
    color: '#888',
  },
  scaleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  catAction: {
    padding: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0c0c0',
    backgroundColor: '#fff',
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    color: '#c0392b',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 12,
    marginTop: 20,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3A5C',
    marginBottom: 12,
  },
  scaleHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    color: '#333',
    marginBottom: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#1B3A5C',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
