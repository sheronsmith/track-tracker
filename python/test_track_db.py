import os
import sqlite3
import tempfile
import unittest

import track_db


class TrackDbTests(unittest.TestCase):

    def setUp(self):
        # fresh in-memory database for every test
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        track_db.create_table(self.conn)

        self.conn.executemany(
            "INSERT INTO races (date, meet, event, seconds) VALUES (?, ?, ?, ?)",
            [
                ("2026-03-14", "Opener", "800m", 127.4),
                ("2026-04-11", "Twilight", "800m", 122.1),
                ("2026-05-09", "Last Chance", "800m", 118.4),
                ("2025-05-10", "Old Meet", "800m", 130.0),
                ("2026-05-09", "Last Chance", "400m", 52.9),
            ],
        )
        self.conn.commit()

    def test_parse_time(self):
        self.assertEqual(track_db.parse_time("52.3"), 52.3)
        self.assertEqual(track_db.parse_time("1:58.4"), 118.4)
        self.assertIsNone(track_db.parse_time("abc"))
        self.assertIsNone(track_db.parse_time("1:75"))

    def test_format_time(self):
        self.assertEqual(track_db.format_time(52.3), "52.30")
        self.assertEqual(track_db.format_time(118.4), "1:58.40")
        self.assertEqual(track_db.format_time(65.2), "1:05.20")

    def test_personal_records(self):
        prs = track_db.personal_records(self.conn)
        by_event = {r["event"]: r for r in prs}

        self.assertEqual(by_event["800m"]["seconds"], 118.4)
        self.assertEqual(by_event["400m"]["seconds"], 52.9)

    def test_season_bests(self):
        bests = track_db.season_bests(self.conn, 2025)
        self.assertEqual(len(bests), 1)
        self.assertEqual(bests[0]["seconds"], 130.0)

    def test_pace_per_400(self):
        rows = track_db.pace_per_400(self.conn, "800m")
        self.assertEqual(len(rows), 4)
        # 118.4 for 800m is 59.2 per 400
        self.assertAlmostEqual(rows[-1]["pace_400"], 59.2, places=2)

    def test_progress_change(self):
        rows = track_db.progress(self.conn, "800m")
        self.assertIsNone(rows[0]["change"])
        self.assertAlmostEqual(rows[-1]["change"], 118.4 - 122.1, places=2)

    def test_load_csv(self):
        fd, path = tempfile.mkstemp(suffix=".csv")
        with os.fdopen(fd, "w") as f:
            f.write("date,meet,event,time\n")
            f.write("2026-03-01,Test Meet,400m,55.1\n")
            f.write("2026-03-01,Test Meet,Mile,4:50\n")
            f.write("2026-03-01,Test Meet,800m,notatime\n")

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        count = track_db.load_csv(conn, path)
        os.remove(path)

        self.assertEqual(count, 2)


if __name__ == "__main__":
    unittest.main()
