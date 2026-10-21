"""Hobday et al. marine heatwave detection for one daily SST series."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class HobdayResult:
    records: list[dict[str, Any]]
    events: list[dict[str, Any]]
    settings: dict[str, Any]


def _day_of_year_without_leap(date: pd.Timestamp) -> int:
    day = date.dayofyear
    return day - 1 if date.is_leap_year and day > 59 else day


def _climatology(values: pd.Series, dates: pd.Series, percentile: float) -> tuple[dict[int, float], dict[int, float]]:
    day_numbers = dates.map(_day_of_year_without_leap)
    grouped = pd.DataFrame({"value": values, "day": day_numbers}).groupby("day")["value"]
    days = range(1, 366)
    climatology = pd.Series(grouped.mean()).reindex(days).interpolate(limit_direction="both")
    threshold = pd.Series(grouped.quantile(percentile / 100)).reindex(days).interpolate(limit_direction="both")
    climatology = climatology.rolling(window=11, center=True, min_periods=1).mean().to_dict()
    threshold = threshold.rolling(window=11, center=True, min_periods=1).mean().to_dict()
    return climatology, threshold


def detect_hobday_events(
    series: pd.DataFrame,
    baseline_start: str,
    baseline_end: str,
    *,
    percentile: float = 90,
    min_duration: int = 5,
    max_gap: int = 2,
) -> HobdayResult:
    """Detect events in a DataFrame containing ``date`` and ``sst`` columns."""
    missing = {"date", "sst"}.difference(series.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
    if not 0 < percentile < 100 or min_duration < 1 or max_gap < 0:
        raise ValueError("Invalid Hobday settings")

    frame = series[["date", "sst"]].copy()
    frame["date"] = pd.to_datetime(frame["date"], utc=True).dt.tz_localize(None)
    frame["sst"] = pd.to_numeric(frame["sst"], errors="coerce")
    frame = frame.dropna().sort_values("date").drop_duplicates("date").reset_index(drop=True)
    baseline = frame[frame["date"].between(baseline_start, baseline_end)]
    if baseline.empty:
        raise ValueError("The requested baseline does not overlap the SST series")

    climatology, threshold = _climatology(baseline["sst"], baseline["date"], percentile)
    frame["day"] = frame["date"].map(_day_of_year_without_leap)
    frame["climatology"] = frame["day"].map(climatology)
    frame["threshold"] = frame["day"].map(threshold)
    frame["is_hot"] = frame["sst"] > frame["threshold"]

    candidate_groups: list[list[int]] = []
    for index in frame.index[frame["is_hot"]].tolist():
        previous_index = candidate_groups[-1][-1] if candidate_groups else None
        date_gap = (frame.loc[index, "date"] - frame.loc[previous_index, "date"]).days if previous_index is not None else None
        if not candidate_groups or date_gap > max_gap + 1:
            candidate_groups.append([index])
        else:
            candidate_groups[-1].append(index)

    events: list[dict[str, Any]] = []
    event_index_by_row: dict[int, str] = {}
    for event_number, indices in enumerate(candidate_groups, start=1):
        start_index, end_index = indices[0], indices[-1]
        duration = (frame.loc[end_index, "date"] - frame.loc[start_index, "date"]).days + 1
        if duration < min_duration:
            continue
        event_id = f"MHW-{event_number:04d}"
        event_rows = frame.loc[start_index:end_index]
        peak_row = event_rows.loc[event_rows["sst"].idxmax()]
        intensity_ratio = ((event_rows["sst"] - event_rows["threshold"]) / (event_rows["threshold"] - event_rows["climatology"]).replace(0, np.nan)).max()
        ratio = float(intensity_ratio) if pd.notna(intensity_ratio) else 0
        category = "moderate" if ratio < 2 else "strong" if ratio < 3 else "severe" if ratio < 4 else "extreme"
        for row_index in indices:
            event_index_by_row[row_index] = event_id
        events.append({
            "id": event_id,
            "start": frame.loc[start_index, "date"].date().isoformat(),
            "end": frame.loc[end_index, "date"].date().isoformat(),
            "durationDays": duration,
            "peakDate": peak_row["date"].date().isoformat(),
            "peakSst": round(float(peak_row["sst"]), 4),
            "peakIntensity": round(float((event_rows["sst"] - event_rows["climatology"]).max()), 4),
            "category": category,
        })

    records = [{
        "date": row["date"].date().isoformat(),
        "sst": round(float(row["sst"]), 4),
        "climatology": round(float(row["climatology"]), 4),
        "threshold": round(float(row["threshold"]), 4),
        "anomaly": round(float(row["sst"] - row["climatology"]), 4),
        "eventId": event_index_by_row.get(index),
    } for index, row in frame.iterrows()]
    return HobdayResult(records, events, {
        "baselineStart": baseline_start,
        "baselineEnd": baseline_end,
        "percentile": percentile,
        "minDurationDays": min_duration,
        "maxGapDays": max_gap,
        "method": "Hobday et al. marine heatwave definition",
    })