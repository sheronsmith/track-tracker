"""
Track Tracker - SQLite version

Loads races from a CSV file into a SQLite database and runs a few queries.

Usage:
    python track_db.py load            # build track.db from ../data/races.csv
    python track_db.py prs             # fastest time in each event
    python track_db.py season 2026     # season bests for one year
    python track_db.py pace 800m       # pace per 400m for every race in an event
    python track_db.py progress 800m   # all races in an event, oldest first
"""

import csv
import os
import sqlite3
import sys


HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "track.db")
CSV_PATH = os.path.join(HERE, "..", "data", "races.csv")

EVENT_METERS = {
    "400m": 400,
    "800m": 800,
    "Mile": 1609,
}


# ---------- helpers ----------

def parse_time(text):
    """Turn '1:58.4' or '52.3' into seconds. Returns None if it's not a time."""

    text = text.strip()

    if ":" in text:
        minutes, seconds = text.split(":")
        try:
            minutes = int(minutes)
            seconds = float(seconds)
        except ValueError:
            return None

        if seconds >= 60:
            return None

        return minutes * 60 + seconds

    try:
        return float(text)
    except ValueError:
        return None


def format_time(seconds):
    """Turn 118.4 back into '1:58.40'."""

    if seconds is None:
        return "--"

    minutes = int(seconds // 60)
    secs = seconds - minutes * 60

    if minutes > 0:
        return "%d:%05.2f" % (minutes, secs)

    return "%.2f" % secs


def connect(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# ---------- loading ----------

def create_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS races (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            date     TEXT NOT NULL,
            meet     TEXT NOT NULL,
            event    TEXT NOT NULL,
            seconds  REAL NOT NULL
        )
    """)
    conn.commit()


def load_csv(conn, csv_path=CSV_PATH):
    """Read the CSV and put every row into the races table."""

    create_table(conn)
    conn.execute("DELETE FROM races")

    count = 0

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            seconds = parse_time(row["time"])

            if seconds is None:
                print("Skipping bad time:", row)
                continue

            conn.execute(
                "INSERT INTO races (date, meet, event, seconds) VALUES (?, ?, ?, ?)",
                (row["date"], row["meet"], row["event"], seconds),
            )
            count += 1

    conn.commit()
    return count


# ---------- queries ----------

def personal_records(conn):
    """Fastest time in each event."""

    rows = conn.execute("""
        SELECT event, date, meet, MIN(seconds) AS seconds
        FROM races
        GROUP BY event
        ORDER BY event
    """).fetchall()

    return [dict(r) for r in rows]


def season_bests(conn, year):
    """Fastest time in each event for one year."""

    rows = conn.execute("""
        SELECT event, date, meet, MIN(seconds) AS seconds
        FROM races
        WHERE strftime('%Y', date) = ?
        GROUP BY event
        ORDER BY event
    """, (str(year),)).fetchall()

    return [dict(r) for r in rows]


def pace_per_400(conn, event):
    """Average 400m split for every race in an event."""

    meters = EVENT_METERS.get(event)

    if meters is None:
        return []

    rows = conn.execute("""
        SELECT date, meet, seconds, seconds / ? * 400 AS pace_400
        FROM races
        WHERE event = ?
        ORDER BY date
    """, (meters, event)).fetchall()

    return [dict(r) for r in rows]


def progress(conn, event):
    """All races in one event, oldest first, with the change from the race before."""

    rows = conn.execute("""
        SELECT date, meet, seconds,
               seconds - LAG(seconds) OVER (ORDER BY date) AS change
        FROM races
        WHERE event = ?
        ORDER BY date
    """, (event,)).fetchall()

    return [dict(r) for r in rows]


# ---------- command line ----------

def print_table(rows, columns):
    if not rows:
        print("(no results)")
        return

    widths = {}
    for col in columns:
        widths[col] = max(len(col), max(len(str(r.get(col, ""))) for r in rows))

    header = "  ".join(col.ljust(widths[col]) for col in columns)
    print(header)
    print("-" * len(header))

    for r in rows:
        print("  ".join(str(r.get(col, "")).ljust(widths[col]) for col in columns))


def main(args):
    if not args:
        print(__doc__)
        return

    command = args[0]
    conn = connect()

    if command == "load":
        count = load_csv(conn)
        print("Loaded %d races into %s" % (count, DB_PATH))

    elif command == "prs":
        rows = personal_records(conn)
        for r in rows:
            r["time"] = format_time(r["seconds"])
        print_table(rows, ["event", "time", "meet", "date"])

    elif command == "season":
        year = args[1] if len(args) > 1 else "2026"
        rows = season_bests(conn, year)
        for r in rows:
            r["time"] = format_time(r["seconds"])
        print("Season bests for", year)
        print_table(rows, ["event", "time", "meet", "date"])

    elif command == "pace":
        event = args[1] if len(args) > 1 else "800m"
        rows = pace_per_400(conn, event)
        for r in rows:
            r["time"] = format_time(r["seconds"])
            r["per_400"] = format_time(r["pace_400"])
        print("Pace per 400m for the", event)
        print_table(rows, ["date", "meet", "time", "per_400"])

    elif command == "progress":
        event = args[1] if len(args) > 1 else "800m"
        rows = progress(conn, event)
        for r in rows:
            r["time"] = format_time(r["seconds"])
            if r["change"] is None:
                r["change"] = ""
            else:
                r["change"] = "%+.2f" % r["change"]
        print("Progress in the", event)
        print_table(rows, ["date", "meet", "time", "change"])

    else:
        print("Unknown command:", command)
        print(__doc__)

    conn.close()


if __name__ == "__main__":
    main(sys.argv[1:])
