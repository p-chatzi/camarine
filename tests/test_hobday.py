import unittest

import pandas as pd

from hobday import detect_hobday_events


class HobdayDetectionTest(unittest.TestCase):
    def test_detects_event_with_allowed_gap(self) -> None:
        dates = pd.date_range("1991-01-01", "2021-01-20", freq="D")
        sst = [20.0 for _ in dates]
        for index, date in enumerate(dates):
            if pd.Timestamp("2020-07-10") <= date <= pd.Timestamp("2020-07-16"):
                sst[index] = 24.0
            if date == pd.Timestamp("2020-07-13"):
                sst[index] = 20.0
        result = detect_hobday_events(pd.DataFrame({"date": dates, "sst": sst}), "1991-01-01", "2019-12-31")
        self.assertEqual(len(result.events), 1)
        self.assertEqual(result.events[0]["durationDays"], 7)
        self.assertEqual(result.events[0]["category"], "moderate")


if __name__ == "__main__":
    unittest.main()