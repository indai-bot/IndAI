import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "indai.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            gender TEXT DEFAULT 'Male',
            birthdate TEXT,
            country_code TEXT DEFAULT '+91',
            mobile TEXT,
            current_plan TEXT DEFAULT 'free',
            credits INTEGER DEFAULT 0,
            api_key TEXT UNIQUE,
            photo_url TEXT,
            email_verified INTEGER DEFAULT 0,
            verification_code TEXT,
            reset_code TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Clients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Folders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            parent_folder_id INTEGER,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
        )
    ''')
    
    # Jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            subject TEXT,
            description TEXT,
            frequency TEXT DEFAULT 'Daily',
            job_date TEXT,
            job_time TEXT DEFAULT '12:00',
            timezone TEXT DEFAULT 'Asia/Kolkata',
            estimated_hours REAL DEFAULT 1,
            credits INTEGER,
            verified INTEGER DEFAULT 0,
            running INTEGER DEFAULT 0,
            next_run TEXT,
            supporting_files TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            description TEXT,
            service TEXT,
            balance INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_id INTEGER,
            job_name TEXT NOT NULL,
            client_name TEXT NOT NULL,
            from_user TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
            accepted_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Time saved records table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS time_saved (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            job_name TEXT NOT NULL,
            estimated_hours REAL NOT NULL,
            actual_run_time TEXT,
            time_saved REAL NOT NULL,
            status TEXT DEFAULT 'success',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Service usage table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            service_name TEXT NOT NULL,
            credits_used INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Activity logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            time TEXT DEFAULT CURRENT_TIMESTAMP,
            message TEXT NOT NULL,
            duration TEXT,
            status TEXT DEFAULT 'info',
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    ''')
    
    # Contact messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Pending verifications table (temporary storage before email verification)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pending_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            verification_code TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT DEFAULT (datetime('now', '+1 hour'))
        )
    ''')
    
    conn.commit()
    conn.close()