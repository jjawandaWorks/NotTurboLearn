"""
database.py

Database management module for the LectureScribe application.

This module handles all database operations for LectureScribe, including:

- Initialization and schema creation for folders, transcripts, and the transcription queue.
- Secure storage and retrieval of transcript data paths.
- A persistent queue for managing transcription jobs.
- Support for session management and data integrity.

The design ensures robust error handling, extensibility, and secure access to user data. It is intended for use in secure, internal deployments.

Author: Jaspreet Jawanda
Email: jaspreetjawanda@proton.me
Version: 2.1
Status: Production
"""

import sqlite3
import os
from pathlib import Path

DATABASE_FILE = '../data/lecturescribe.db'
DATA_FOLDER = '../data'

db_path = Path(DATABASE_FILE)
data_path = Path(DATA_FOLDER)
db_path.parent.mkdir(parents=True, exist_ok=True)
data_path.mkdir(parents=True, exist_ok=True)


print(f"Directory '{db_path.parent}' is ready.")

def init_db():
    """
    Initializes the SQLite database and creates the necessary tables
    if they do not already exist.
    """
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        # Table for folders
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Table for transcripts with a path to the data folder
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transcripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                data_path TEXT NOT NULL,
                folder_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL
            )
        ''')

        # Table for the transcription queue
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transcription_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audio_path TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                transcript_id INTEGER,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Table for user song/content ownership (Section C1)
        # Maps users to owned songs/transcripts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_song_ownership (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                song_id INTEGER NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source TEXT,
                UNIQUE(user_id, song_id),
                FOREIGN KEY (song_id) REFERENCES transcripts (id) ON DELETE CASCADE
            )
        ''')

        # Table for liked songs/transcripts (Section C2)
        # Tracks songs/transcripts liked by a user
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_liked_songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                song_id INTEGER NOT NULL,
                liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, song_id),
                FOREIGN KEY (song_id) REFERENCES transcripts (id) ON DELETE CASCADE
            )
        ''')

        # Add a default folder if it doesn't exist
        cursor.execute("SELECT id FROM folders WHERE name = ?", ('Unorganized',))
        if cursor.fetchone() is None:
            cursor.execute("INSERT INTO folders (name) VALUES (?)", ('Unorganized',))

        conn.commit()
        print("Database and tables verified successfully.")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # Allows running this script directly to create/update the database
    init_db()