import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCategories,
  getRatingScale,
  getEvaluationsForEmployee,
  getCommentsForEmployee,
  upsertEvaluation,
  addComment,
} from '../storage/database';
import { getTodayString, formatDisplayDate, formatTimestamp } from '../utils/dateUtils';

export default function EvaluationScreen({ navigation, route }) {
  const { employee } = route.params;
  const today = getTodayString();

  const [categories, setCategories] = useState([]);
  const [ratingScale, setRatingScale] = useState({ min_value: 1, max_value: 5, best_value: 5 });
  const [ratings, setRatings] = useState({});
  const [existingEvals, setExistingEvals] = useState([]);
  const [todayComments, setTodayComments] = useState([]);
  const [showComments, setShowComments] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCategoryId, setCommentCategoryId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [generalCommentText, setGeneralCommentText] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const cats = await getCategories();
      setCategories(cats);

      const scale = await getRatingScale();
      setRatingScale(scale);

      const evals = await getEvaluationsForEmployee(employee.id, today);
      setExistingEvals(evals);

      // Pre-fill ratings if already evaluated today
      const ratingMap = {};
      for (const ev of evals) {
        ratingMap[ev.category_id] = ev.rating;
      }
      setRatings(ratingMap);
      setIsUpdating(evals.length > 0);

      const comments = await getCommentsForEmployee(employee.id, today);
      setTodayComments(comments);
      setShowComments(comments.length > 0);
    } catch (e) {
      Alert.alert('Error', 'Failed to load evaluation data.');
    }
  }

  function handleRating(categoryId, value) {
    const midpoint = Math.round((ratingScale.min_value + ratingScale.max_value) / 2);
    setRatings((prev) => {
      const newRatings = { ...prev, [categoryId]: value };
      // If rating is not the midpoint (3 by default), prompt for comment
      if (value !== midpoint) {
        setCommentCategoryId(categoryId);
        setCommentText('');
        setCommentModalVisible(true);
      }
      return newRatings;
    });
  }

  async function saveComment() {
    if (!commentText.trim()) {
      setCommentModalVisible(false);
      return;
    }
    try {
      await addComment(employee.id, commentCategoryId, commentText.trim(), today);
      setCommentModalVisible(false);
      setCommentText('');
      // Reload comments
      const comments = await getCommentsForEmployee(employee.id, today);
      setTodayComments(comments);
      setShowComments(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to save comment.');
    }
  }

  async function saveGeneralComment() {
    if (!generalCommentText.trim()) return;
    try {
      await addComment(employee.id, null, generalCommentText.trim(), today);
      setGeneralCommentText('');
      const comments = await getCommentsForEmployee(employee.id, today);
      setTodayComments(comments);
      setShowComments(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to save comment.');
    }
  }

  async function handleSubmit() {
    // Check all categories are rated
    const unrated = categories.filter((c) => !ratings[c.id]);
    if (unrated.length > 0) {
      Alert.alert(
        'Incomplete',
        `Please rate all categories. Missing: ${unrated.map((c) => c.name).join(', ')}`
      );
      return;
    }
    try {
      for (const cat of categories) {
        await upsertEvaluation(employee.id, cat.id, ratings[cat.id], today);
      }
      Alert.alert(
        'Success',
        isUpdating ? 'Ratings updated successfully.' : 'Evaluation saved successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save evaluation.');
    }
  }

  function getCategoryNameById(id) {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : 'General';
  }

  function renderRatingButtons(categoryId) {
    const buttons = [];
    for (let i = ratingScale.min_value; i <= ratingScale.max_value; i++) {
      const selected = ratings[categoryId] === i;
      buttons.push(
        <TouchableOpacity
          key={i}
          style={[styles.ratingButton, selected && styles.ratingButtonSelected]}
          onPress={() => handleRating(categoryId, i)}
        >
          <Text style={[styles.ratingButtonText, selected && styles.ratingButtonTextSelected]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return buttons;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Employee header */}
        <View style={styles.employeeHeader}>
          {employee.photo_uri ? (
            <Image source={{ uri: employee.photo_uri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={30} color="#fff" />
            </View>
          )}
          <View>
            <Text style={styles.employeeName}>
              {employee.first_name} {employee.last_name}
            </Text>
            <Text style={styles.evalDate}>{formatDisplayDate(today)}</Text>
            {isUpdating && (
              <Text style={styles.updateBadge}>Updating existing ratings</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('AddEmployee', { employee })}
          >
            <Ionicons name="create-outline" size={20} color="#1B3A5C" />
          </TouchableOpacity>
        </View>

        {/* Today's existing comments shown first */}
        {showComments && todayComments.length > 0 && (
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Today's Comments</Text>
            {todayComments.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <Text style={styles.commentCategory}>
                  {c.category_name || 'General'}
                </Text>
                <Text style={styles.commentBody}>{c.comment}</Text>
                <Text style={styles.commentTime}>{formatTimestamp(c.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* General comment (no rating needed) */}
        <View style={styles.generalCommentSection}>
          <Text style={styles.sectionTitle}>Add a Comment</Text>
          <TextInput
            style={styles.generalCommentInput}
            value={generalCommentText}
            onChangeText={setGeneralCommentText}
            placeholder="Enter a general comment about this employee..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.addCommentButton, !generalCommentText.trim() && styles.buttonDisabled]}
            onPress={saveGeneralComment}
            disabled={!generalCommentText.trim()}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            <Text style={styles.addCommentButtonText}>Save Comment</Text>
          </TouchableOpacity>
        </View>

        {/* Rating categories */}
        <Text style={styles.sectionTitle}>
          Ratings ({ratingScale.min_value}-{ratingScale.max_value}, {ratingScale.best_value} = best)
        </Text>

        {categories.map((cat) => (
          <View key={cat.id} style={styles.categoryCard}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <View style={styles.ratingRow}>{renderRatingButtons(cat.id)}</View>
          </View>
        ))}

        {/* Submit button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {isUpdating ? 'Update Ratings' : 'Submit Ratings'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Comment modal for non-midpoint ratings */}
      <Modal visible={commentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Comment</Text>
            <Text style={styles.modalSubtitle}>
              Rating of {ratings[commentCategoryId]} for{' '}
              {commentCategoryId ? getCategoryNameById(commentCategoryId) : ''}
            </Text>
            <Text style={styles.modalHint}>
              This rating differs from average — please explain.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Enter your comment..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSkipButton}
                onPress={() => {
                  setCommentModalVisible(false);
                  setCommentText('');
                }}
              >
                <Text style={styles.modalSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, !commentText.trim() && styles.buttonDisabled]}
                onPress={saveComment}
                disabled={!commentText.trim()}
              >
                <Text style={styles.modalSaveText}>Save Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#a0c4e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  evalDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  updateBadge: {
    fontSize: 11,
    color: '#b8860b',
    fontWeight: '600',
    marginTop: 3,
  },
  editButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  commentsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B3A5C',
    marginBottom: 10,
  },
  commentCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#1B3A5C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B3A5C',
    marginBottom: 4,
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  generalCommentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  generalCommentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  addCommentButton: {
    flexDirection: 'row',
    backgroundColor: '#1B3A5C',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addCommentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  categoryCard: {
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
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonSelected: {
    backgroundColor: '#1B3A5C',
    borderColor: '#1B3A5C',
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  ratingButtonTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2d7d46',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3A5C',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalSkipButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalSkipText: {
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
