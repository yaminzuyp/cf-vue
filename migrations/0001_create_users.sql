-- Migration number: 0001 	 2025-06-21T08:54:20.430Z

CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

