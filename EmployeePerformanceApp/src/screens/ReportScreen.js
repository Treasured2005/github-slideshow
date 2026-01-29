import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getReportData, getRatingScale, getForemanName } from '../storage/database';
import { getDateRange, formatDisplayDate, formatTimestamp, PERIOD_OPTIONS } from '../utils/dateUtils';
import { generateReportHtml, generatePdf, emailPdf, sharePdf } from '../utils/pdfGenerator';

export default function ReportScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [reportData, setReportData] = useState(null);
  const [ratingScale, setRatingScale] = useState({ min_value: 1, max_value: 5, best_value: 5 });
  const [foremanName, setForemanName] = useState('');
  const [loading, setLoading] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadReport(selectedPeriod);
    }, [selectedPeriod])
  );

  async function loadReport(period) {
    setLoading(true);
    try {
      const range = getDateRange(period);
      const data = await getReportData(range.startDate, range.endDate);
      const scale = await getRatingScale();
      const name = await getForemanName();
      setReportData({ ...data, periodLabel: range.label });
      setRatingScale(scale);
      setForemanName(name);
    } catch (e) {
      Alert.alert('Error', 'Failed to load report data.');
    }
    setLoading(false);
  }

  function selectPeriod(period) {
    setSelectedPeriod(period);
    setPeriodModalVisible(false);
  }

  async function handleExportPdf() {
    if (!reportData) return;
    try {
      const html = generateReportHtml(reportData, foremanName, reportData.periodLabel, ratingScale);
      const pdfUri = await generatePdf(html);
      await sharePdf(pdfUri);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF. ' + e.message);
    }
  }

  async function handleEmailPdf() {
    if (!reportData || !emailAddress.trim()) return;
    try {
      const html = generateReportHtml(reportData, foremanName, reportData.periodLabel, ratingScale);
      const pdfUri = await generatePdf(html);
      await emailPdf(
        pdfUri,
        emailAddress.trim(),
        `Performance Report - ${reportData.periodLabel}`
      );
      setEmailModalVisible(false);
      setEmailAddress('');
    } catch (e) {
      Alert.alert('Error', 'Failed to email PDF. ' + e.message);
    }
  }

  function getAvgColor(avg) {
    if (avg === 0) return '#999';
    const midpoint = (ratingScale.min_value + ratingScale.max_value) / 2;
    if (ratingScale.best_value === ratingScale.max_value) {
      return avg >= midpoint + 0.5 ? '#2d7d46' : avg >= midpoint - 0.5 ? '#b8860b' : '#c0392b';
    }
    return avg <= midpoint - 0.5 ? '#2d7d46' : avg <= midpoint + 0.5 ? '#b8860b' : '#c0392b';
  }

  const currentLabel = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.label || '';

  return (
    <View style={styles.container}>
      {/* Period selector */}
      <View style={styles.periodBar}>
        <TouchableOpacity
          style={styles.periodSelector}
          onPress={() => setPeriodModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#1B3A5C" />
          <Text style={styles.periodText}>{currentLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#1B3A5C" />
        </TouchableOpacity>
        <View style={styles.periodActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportPdf}>
            <Ionicons name="share-outline" size={20} color="#1B3A5C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEmailModalVisible(true)}
          >
            <Ionicons name="mail-outline" size={20} color="#1B3A5C" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B3A5C" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : reportData && reportData.employees.length > 0 ? (
        <ScrollView contentContainerStyle={styles.reportScroll} showsVerticalScrollIndicator={false}>
          {/* Report header info */}
          <View style={styles.reportMeta}>
            <Text style={styles.metaText}>Foreman: {foremanName}</Text>
            <Text style={styles.metaText}>Period: {reportData.periodLabel}</Text>
            <Text style={styles.metaText}>
              Report Date: {new Date().toLocaleDateString()}
            </Text>
            <Text style={styles.metaText}>
              Scale: {ratingScale.min_value}-{ratingScale.max_value} ({ratingScale.best_value} = best)
            </Text>
          </View>

          {reportData.employees.map((empData) => (
            <View key={empData.employee.id} style={styles.employeeSection}>
              <Text style={styles.employeeName}>
                {empData.employee.first_name} {empData.employee.last_name}
              </Text>

              {/* Ratings table */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.colCategory]}>Category</Text>
                  <Text style={[styles.tableHeaderText, styles.colDays]}>Days</Text>
                  <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
                  <Text style={[styles.tableHeaderText, styles.colAvg]}>Avg</Text>
                </View>
                {empData.categories.map((cd) => (
                  <View key={cd.category.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colCategory]}>{cd.category.name}</Text>
                    <Text style={[styles.tableCell, styles.colDays]}>{cd.days_rated}</Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>
                      {cd.days_rated > 0 ? cd.total_rating : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.colAvg,
                        { color: getAvgColor(cd.avg_rating), fontWeight: 'bold' },
                      ]}
                    >
                      {cd.days_rated > 0 ? cd.avg_rating.toFixed(2) : '-'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Comments */}
              {empData.comments.length > 0 && (
                <View style={styles.commentsBlock}>
                  <Text style={styles.commentsTitle}>Comments</Text>
                  {empData.comments.map((c) => (
                    <View key={c.id} style={styles.commentItem}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentCat}>{c.category_name || 'General'}</Text>
                        <Text style={styles.commentDate}>{formatTimestamp(c.created_at)}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.comment}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Data</Text>
          <Text style={styles.emptySubtitle}>
            No evaluations found for {currentLabel}.
          </Text>
        </View>
      )}

      {/* Period selection modal */}
      <Modal visible={periodModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPeriodModalVisible(false)}
        >
          <View style={styles.periodModal}>
            <Text style={styles.periodModalTitle}>Select Report Period</Text>
            {PERIOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.periodOption,
                  selectedPeriod === opt.key && styles.periodOptionSelected,
                ]}
                onPress={() => selectPeriod(opt.key)}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    selectedPeriod === opt.key && styles.periodOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedPeriod === opt.key && (
                  <Ionicons name="checkmark" size={20} color="#1B3A5C" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Email modal */}
      <Modal visible={emailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.emailModal}>
            <Text style={styles.emailModalTitle}>Email Report</Text>
            <Text style={styles.emailModalSubtitle}>
              Send {currentLabel} report as PDF
            </Text>
            <TextInput
              style={styles.emailInput}
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.emailButtons}>
              <TouchableOpacity
                style={styles.emailCancelButton}
                onPress={() => {
                  setEmailModalVisible(false);
                  setEmailAddress('');
                }}
              >
                <Text style={styles.emailCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emailSendButton, !emailAddress.trim() && styles.buttonDisabled]}
                onPress={handleEmailPdf}
                disabled={!emailAddress.trim()}
              >
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.emailSendText}>Send</Text>
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
  periodBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B3A5C',
  },
  periodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
    fontSize: 14,
  },
  reportScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  reportMeta: {
    backgroundColor: '#1B3A5C',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  metaText: {
    color: '#d0e0f0',
    fontSize: 13,
    marginBottom: 3,
  },
  employeeSection: {
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
  employeeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B3A5C',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1B3A5C',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
  },
  colCategory: { flex: 2 },
  colDays: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 1, textAlign: 'center' },
  colAvg: { flex: 1, textAlign: 'center' },
  commentsBlock: {
    marginTop: 10,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B3A5C',
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#1B3A5C',
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentCat: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  commentDate: {
    fontSize: 10,
    color: '#999',
  },
  commentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
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
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodModal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '80%',
  },
  periodModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3A5C',
    marginBottom: 16,
    textAlign: 'center',
  },
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  periodOptionSelected: {
    backgroundColor: '#f0f4f8',
  },
  periodOptionText: {
    fontSize: 15,
    color: '#333',
  },
  periodOptionTextSelected: {
    color: '#1B3A5C',
    fontWeight: '600',
  },
  emailModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  emailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3A5C',
    marginBottom: 4,
  },
  emailModalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  emailButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  emailCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  emailCancelText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  emailSendButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#1B3A5C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emailSendText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
