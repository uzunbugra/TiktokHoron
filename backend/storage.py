"""Small SQLite profile store for persistent regular-viewer cosmetics."""
from __future__ import annotations

import sqlite3
from pathlib import Path


def loyalty_for(visits: int) -> str:
    if visits >= 10:
        return 'gold'
    if visits >= 5:
        return 'silver'
    if visits >= 2:
        return 'bronze'
    return 'new'


class ProfileStore:
    def __init__(self, path: str | Path):
        self.connection = sqlite3.connect(str(path), check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute('''
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY,
                nickname TEXT NOT NULL,
                visits INTEGER NOT NULL DEFAULT 0,
                activity INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.connection.commit()

    def record(self, user_id: str, nickname: str, *, new_visit: bool, activity: int = 1):
        self.connection.execute('''
            INSERT INTO profiles (user_id, nickname, visits, activity)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                nickname = excluded.nickname,
                visits = profiles.visits + excluded.visits,
                activity = profiles.activity + excluded.activity,
                updated_at = CURRENT_TIMESTAMP
        ''', (user_id, nickname, int(new_visit), activity))
        self.connection.commit()
        return self.get(user_id)

    def get(self, user_id: str):
        row = self.connection.execute(
            'SELECT user_id, nickname, visits, activity FROM profiles WHERE user_id = ?',
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result['loyalty'] = loyalty_for(result['visits'])
        return result

    def close(self):
        self.connection.close()
