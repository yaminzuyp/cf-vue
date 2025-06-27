-- Migration number: 0001 	 2025-04-21T10:54:23.652Z

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT
);

