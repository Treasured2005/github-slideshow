import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { formatTimestamp } from './dateUtils';

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateReportHtml(reportData, foremanName, periodLabel, ratingScale) {
  const { employees, categories } = reportData;
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const scaleLabel = `${ratingScale.min_value}-${ratingScale.max_value} (${ratingScale.best_value} = best)`;

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1B3A5C; padding-bottom: 15px; }
      .header h1 { color: #1B3A5C; margin: 0 0 5px 0; font-size: 22px; }
      .meta { color: #666; font-size: 11px; margin: 3px 0; }
      .employee-section { page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ddd; border-radius: 6px; padding: 15px; }
      .employee-name { font-size: 16px; font-weight: bold; color: #1B3A5C; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th { background: #1B3A5C; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
      td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
      tr:nth-child(even) { background: #f8f9fa; }
      .avg-good { color: #2d7d46; font-weight: bold; }
      .avg-ok { color: #b8860b; font-weight: bold; }
      .avg-poor { color: #c0392b; font-weight: bold; }
      .comments-header { font-weight: bold; margin: 15px 0 8px 0; color: #1B3A5C; font-size: 13px; }
      .comment-item { margin: 5px 0; padding: 6px 10px; background: #f0f4f8; border-left: 3px solid #1B3A5C; border-radius: 3px; }
      .comment-meta { font-size: 10px; color: #888; }
      .comment-category { font-weight: bold; color: #555; }
      .no-data { color: #999; font-style: italic; }
      .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Employee Performance Report</h1>
      <p class="meta"><strong>Foreman:</strong> ${escapeHtml(foremanName)}</p>
      <p class="meta"><strong>Period:</strong> ${escapeHtml(periodLabel)}</p>
      <p class="meta"><strong>Report Generated:</strong> ${reportDate}</p>
      <p class="meta"><strong>Rating Scale:</strong> ${scaleLabel}</p>
    </div>
  `;

  if (employees.length === 0) {
    html += '<p class="no-data">No evaluation data found for the selected period.</p>';
  }

  for (const empData of employees) {
    const { employee, categories: catData, comments } = empData;
    const midpoint = (ratingScale.min_value + ratingScale.max_value) / 2;

    html += `
    <div class="employee-section">
      <p class="employee-name">${escapeHtml(employee.first_name)} ${escapeHtml(employee.last_name)}</p>
      <table>
        <tr>
          <th>Category</th>
          <th>Days Rated</th>
          <th>Total Rating</th>
          <th>Average Rating</th>
        </tr>
    `;

    for (const cd of catData) {
      let avgClass = 'no-data';
      if (cd.days_rated > 0) {
        if (ratingScale.best_value === ratingScale.max_value) {
          avgClass = cd.avg_rating >= midpoint + 0.5 ? 'avg-good' : cd.avg_rating >= midpoint - 0.5 ? 'avg-ok' : 'avg-poor';
        } else {
          avgClass = cd.avg_rating <= midpoint - 0.5 ? 'avg-good' : cd.avg_rating <= midpoint + 0.5 ? 'avg-ok' : 'avg-poor';
        }
      }

      html += `
        <tr>
          <td>${escapeHtml(cd.category.name)}</td>
          <td>${cd.days_rated}</td>
          <td>${cd.days_rated > 0 ? cd.total_rating : '-'}</td>
          <td class="${avgClass}">${cd.days_rated > 0 ? cd.avg_rating.toFixed(2) : '-'}</td>
        </tr>
      `;
    }

    html += '</table>';

    if (comments.length > 0) {
      html += '<p class="comments-header">Comments:</p>';
      for (const c of comments) {
        html += `
          <div class="comment-item">
            <span class="comment-category">${c.category_name ? escapeHtml(c.category_name) : 'General'}:</span>
            ${escapeHtml(c.comment)}
            <div class="comment-meta">${formatTimestamp(c.created_at)}</div>
          </div>
        `;
      }
    }

    html += '</div>';
  }

  html += `
    <div class="footer">
      Crew Performance Evaluator &mdash; Confidential
    </div>
  </body>
  </html>`;

  return html;
}

export async function generatePdf(html) {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function emailPdf(pdfUri, recipientEmail, subject) {
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Email is not available on this device.');
  }
  await MailComposer.composeAsync({
    recipients: recipientEmail ? [recipientEmail] : [],
    subject: subject || 'Employee Performance Report',
    body: 'Please find the attached Employee Performance Report.',
    attachments: [pdfUri],
  });
}

export async function sharePdf(pdfUri) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Performance Report',
  });
}
