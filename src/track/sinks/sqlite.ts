import { mkdirSync } from 'fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname } from 'path'
import { LogEvent, Sink } from '../types'

class Sql {
	static readonly schema = `
		CREATE TABLE IF NOT EXISTS logs (
			id         TEXT PRIMARY KEY,
			timestamp  INTEGER NOT NULL,
			name       TEXT NOT NULL,
			level      TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
			attributes TEXT
		);

		CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp);
		CREATE INDEX IF NOT EXISTS idx_logs_level     ON logs (level);
		CREATE INDEX IF NOT EXISTS idx_logs_name      ON logs (name);
	`
	static readonly insert = `
		INSERT INTO logs (id, timestamp, name, level, attributes)
		VALUES ($id, $timestamp, $name, $level, $attributes)
	`
}

export class LogStore {
	private db: DatabaseSync
	private insertStmt

	constructor(path: string) {
		const dir = dirname(path)
		mkdirSync(dir, { recursive: true })

		this.db = new DatabaseSync(path)
		this.db.exec('PRAGMA journal_mode = WAL')
		this.db.exec('PRAGMA synchronous = NORMAL')
		this.db.exec(Sql.schema)
		this.insertStmt = this.db.prepare(Sql.insert)
	}

	insert(event: LogEvent): void {
		this.insertStmt.run({
			$id: event.id,
			$timestamp: event.timestamp,
			$name: event.name,
			$level: event.level,
			$attributes: event.attributes ? JSON.stringify(event.attributes) : null,
		})
	}
	insertMany(events: LogEvent[]): void {
		this.db.exec('BEGIN')
		try {
			for (const event of events) this.insert(event)
			this.db.exec('COMMIT')
		} catch (err) {
			this.db.exec('ROLLBACK')
			throw err
		}
	}

	close(): void {
		this.db.close()
	}
}

export function SqliteSink(path: string): Sink {
	const store = new LogStore(path)

	return {
		mode: 'buffered',
		async writeLogs(events) {
			store.insertMany(events)
		},
	}
}
