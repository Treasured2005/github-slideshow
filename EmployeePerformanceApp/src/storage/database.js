import * as SQLite from 'expo-sqlite';

const DB_NAME = 'crew_performance.db';

let db = null;

export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY DEFAULT 1,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      foreman_name TEXT NOT NULL DEFAULT '',
      CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      photo_uri TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS rating_scale (
      id INTEGER PRIMARY KEY DEFAULT 1,
      min_value INTEGER NOT NULL DEFAULT 1,
      max_value INTEGER NOT NULL DEFAULT 5,
      best_value INTEGER NOT NULL DEFAULT 5,
      CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      eval_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      UNIQUE(employee_id, category_id, eval_date)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      category_id INTEGER,
      comment TEXT NOT NULL,
      eval_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // Seed default categories if none exist
  const catCount = await database.getFirstAsync('SELECT COUNT(*) as count FROM categories');
  if (catCount.count === 0) {
    const defaults = ['Safety', 'Quality', 'Productivity', 'Attendance', 'Teamwork', 'Initiative'];
    for (let i = 0; i < defaults.length; i++) {
      await database.runAsync(
        'INSERT INTO categories (name, sort_order) VALUES (?, ?)',
        [defaults[i], i]
      );
    }
  }

  // Seed default rating scale if none exists
  const scaleCount = await database.getFirstAsync('SELECT COUNT(*) as count FROM rating_scale');
  if (scaleCount.count === 0) {
    await database.runAsync('INSERT INTO rating_scale (min_value, max_value, best_value) VALUES (1, 5, 5)');
  }
}

// ── Credentials ──

export async function hasCredentials() {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT COUNT(*) as count FROM credentials');
  return row.count > 0;
}

export async function createCredentials(username, password, foremanName) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO credentials (id, username, password, foreman_name) VALUES (1, ?, ?, ?)',
    [username, password, foremanName]
  );
}

export async function verifyCredentials(username, password) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM credentials WHERE username = ? AND password = ?',
    [username, password]
  );
  return row !== null;
}

export async function getForemanName() {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT foreman_name FROM credentials WHERE id = 1');
  return row ? row.foreman_name : '';
}

export async function updateForemanName(name) {
  const db = await getDatabase();
  await db.runAsync('UPDATE credentials SET foreman_name = ? WHERE id = 1', [name]);
}

// ── Employees ──

export async function getEmployees() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM employees WHERE active = 1 ORDER BY first_name, last_name');
}

export async function getEmployee(id) {
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM employees WHERE id = ?', [id]);
}

export async function addEmployee(firstName, lastName, photoUri) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO employees (first_name, last_name, photo_uri) VALUES (?, ?, ?)',
    [firstName, lastName, photoUri]
  );
  return result.lastInsertRowId;
}

export async function updateEmployee(id, firstName, lastName, photoUri) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE employees SET first_name = ?, last_name = ?, photo_uri = ? WHERE id = ?',
    [firstName, lastName, photoUri, id]
  );
}

export async function deactivateEmployee(id) {
  const db = await getDatabase();
  await db.runAsync('UPDATE employees SET active = 0 WHERE id = ?', [id]);
}

// ── Categories ──

export async function getCategories() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order');
}

export async function addCategory(name) {
  const db = await getDatabase();
  const maxOrder = await db.getFirstAsync('SELECT MAX(sort_order) as max_order FROM categories');
  const nextOrder = (maxOrder.max_order || 0) + 1;
  const result = await db.runAsync(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)',
    [name, nextOrder]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(id, name) {
  const db = await getDatabase();
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteCategory(id) {
  const db = await getDatabase();
  await db.runAsync('UPDATE categories SET active = 0 WHERE id = ?', [id]);
}

// ── Rating Scale ──

export async function getRatingScale() {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM rating_scale WHERE id = 1');
  return row || { min_value: 1, max_value: 5, best_value: 5 };
}

export async function updateRatingScale(minValue, maxValue, bestValue) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO rating_scale (id, min_value, max_value, best_value) VALUES (1, ?, ?, ?)',
    [minValue, maxValue, bestValue]
  );
}

// ── Evaluations ──

export async function getEvaluation(employeeId, categoryId, evalDate) {
  const db = await getDatabase();
  return await db.getFirstAsync(
    'SELECT * FROM evaluations WHERE employee_id = ? AND category_id = ? AND eval_date = ?',
    [employeeId, categoryId, evalDate]
  );
}

export async function getEvaluationsForEmployee(employeeId, evalDate) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT e.*, c.name as category_name
     FROM evaluations e
     JOIN categories c ON e.category_id = c.id
     WHERE e.employee_id = ? AND e.eval_date = ?
     ORDER BY c.sort_order`,
    [employeeId, evalDate]
  );
}

export async function upsertEvaluation(employeeId, categoryId, rating, evalDate) {
  const db = await getDatabase();
  const existing = await getEvaluation(employeeId, categoryId, evalDate);
  if (existing) {
    await db.runAsync(
      `UPDATE evaluations SET rating = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [rating, existing.id]
    );
    return existing.id;
  } else {
    const result = await db.runAsync(
      'INSERT INTO evaluations (employee_id, category_id, rating, eval_date) VALUES (?, ?, ?, ?)',
      [employeeId, categoryId, rating, evalDate]
    );
    return result.lastInsertRowId;
  }
}

export async function hasEvaluationForDate(employeeId, evalDate) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM evaluations WHERE employee_id = ? AND eval_date = ?',
    [employeeId, evalDate]
  );
  return row.count > 0;
}

// ── Comments ──

export async function addComment(employeeId, categoryId, comment, evalDate) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO comments (employee_id, category_id, comment, eval_date) VALUES (?, ?, ?, ?)',
    [employeeId, categoryId, comment, evalDate]
  );
  return result.lastInsertRowId;
}

export async function getCommentsForEmployee(employeeId, evalDate) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT cm.*, c.name as category_name
     FROM comments cm
     LEFT JOIN categories c ON cm.category_id = c.id
     WHERE cm.employee_id = ? AND cm.eval_date = ?
     ORDER BY cm.created_at DESC`,
    [employeeId, evalDate]
  );
}

export async function getCommentsForPeriod(employeeId, startDate, endDate) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT cm.*, c.name as category_name
     FROM comments cm
     LEFT JOIN categories c ON cm.category_id = c.id
     WHERE cm.employee_id = ? AND cm.eval_date >= ? AND cm.eval_date <= ?
     ORDER BY cm.eval_date, cm.created_at`,
    [employeeId, startDate, endDate]
  );
}

// ── Reports ──

export async function getReportData(startDate, endDate) {
  const db = await getDatabase();

  const employees = await db.getAllAsync(
    'SELECT * FROM employees WHERE active = 1 ORDER BY first_name, last_name'
  );

  const categories = await db.getAllAsync(
    'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order'
  );

  const reportData = [];

  for (const emp of employees) {
    const empData = {
      employee: emp,
      categories: [],
      comments: [],
    };

    for (const cat of categories) {
      const stats = await db.getFirstAsync(
        `SELECT
           COUNT(*) as days_rated,
           COALESCE(SUM(rating), 0) as total_rating,
           CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(rating * 1.0), 2) ELSE 0 END as avg_rating
         FROM evaluations
         WHERE employee_id = ? AND category_id = ? AND eval_date >= ? AND eval_date <= ?`,
        [emp.id, cat.id, startDate, endDate]
      );

      empData.categories.push({
        category: cat,
        days_rated: stats.days_rated,
        total_rating: stats.total_rating,
        avg_rating: stats.avg_rating,
      });
    }

    const comments = await getCommentsForPeriod(emp.id, startDate, endDate);
    empData.comments = comments;

    // Only include employees that have at least one rating or comment in this period
    const hasData = empData.categories.some(c => c.days_rated > 0) || comments.length > 0;
    if (hasData) {
      reportData.push(empData);
    }
  }

  return { employees: reportData, categories, startDate, endDate };
}
