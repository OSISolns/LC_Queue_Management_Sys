"""
roster_insights.py
------------------
AI-powered roster analysis engine. Given a list of roster assignments over a date
range, this module:
  - Computes per-staff and per-department KPIs (hours worked, shifts, etc.)
  - Detects burnout risks (staff over 48 h/week)
  - Identifies under-staffed time windows and departments
  - Generates a human-readable narrative report with structured findings
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_time(t: str) -> Optional[datetime]:
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(t, fmt)
        except ValueError:
            pass
    return None


def _shift_hours(start: str, end: str) -> float:
    """Return the duration in hours between two HH:MM[:SS] strings."""
    t1 = _parse_time(start)
    t2 = _parse_time(end)
    if not t1 or not t2:
        return 8.0  # safe default
    diff = (t2 - t1).total_seconds()
    if diff < 0:
        diff += 86400  # midnight crossing
    return round(diff / 3600, 2)


def _week_number(d: str) -> str:
    """Return ISO week label like '2026-W09' for grouping."""
    try:
        dt = datetime.strptime(d, "%Y-%m-%d")
        return dt.strftime("%G-W%V")
    except ValueError:
        return "Unknown"


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def generate_roster_insights(
    assignments: List[Any],
    start_date: str,
    end_date: str,
    period: str,
) -> Dict[str, Any]:
    """
    Analyse the given roster assignments and return a structured insight report.

    Args:
        assignments: list of RosterAssignment pydantic objects (or dicts)
        start_date:  ISO date string for the beginning of the period
        end_date:    ISO date string for the end of the period
        period:      one of "weekly", "monthly", "quarterly", "yearly"

    Returns:
        A dict with keys: summary, kpis, warnings, optimizations, narrative
    """

    # --- normalise to dicts --------------------------------------------------
    rows: List[dict] = [
        a.dict() if hasattr(a, "dict") else dict(a) for a in assignments
    ]

    if not rows:
        return _empty_report(start_date, end_date, period)

    # --- per-staff metrics ---------------------------------------------------
    staff_hours_total: Dict[int, float] = defaultdict(float)   # staff_id -> total hours
    staff_hours_by_week: Dict[int, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    staff_shifts: Dict[int, int] = defaultdict(int)            # staff_id -> shift count
    staff_names: Dict[int, str] = {}
    staff_roles: Dict[int, str] = {}

    # --- per-department metrics -----------------------------------------------
    dept_hours: Dict[int, float] = defaultdict(float)
    dept_names: Dict[int, str] = {}
    dept_shifts: Dict[int, int] = defaultdict(int)
    dept_dates: Dict[int, set] = defaultdict(set)

    for row in rows:
        sid = row["staff_id"]
        did = row["department_id"]
        hrs = _shift_hours(row["shift_start_time"], row["shift_end_time"])
        week = _week_number(row["date"])

        staff_hours_total[sid] += hrs
        staff_hours_by_week[sid][week] += hrs
        staff_shifts[sid] += 1
        staff_names[sid] = row.get("staff_name", f"Staff {sid}")
        staff_roles[sid] = row.get("role", "Staff")

        dept_hours[did] += hrs
        dept_shifts[did] += 1
        dept_names[did] = row.get("department_name", f"Dept {did}")
        dept_dates[did].add(row["date"])

    # --- date range bookkeeping ----------------------------------------------
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt   = datetime.strptime(end_date,   "%Y-%m-%d").date()
    except ValueError:
        start_dt = date.today()
        end_dt   = date.today()

    total_days = max((end_dt - start_dt).days + 1, 1)
    total_weeks = total_days / 7

    # --- burnout detection ---------------------------------------------------
    BURNOUT_HOURS_PER_WEEK = 48.0
    burnout_staff: List[dict] = []

    for sid, weekly in staff_hours_by_week.items():
        for week, hrs in weekly.items():
            if hrs > BURNOUT_HOURS_PER_WEEK:
                burnout_staff.append({
                    "staff_id": sid,
                    "staff_name": staff_names[sid],
                    "role": staff_roles[sid],
                    "week": week,
                    "hours": round(hrs, 1),
                    "excess_hours": round(hrs - BURNOUT_HOURS_PER_WEEK, 1),
                })

    # --- coverage gap detection ----------------------------------------------
    # Simple heuristic: a department with < 1 staff per working day is under-covered
    EXPECTED_STAFF_PER_DAY = 1
    coverage_gaps: List[dict] = []

    for did, covered_dates in dept_dates.items():
        expected_coverage_days = total_days
        actual_coverage_days   = len(covered_dates)
        gap_days = expected_coverage_days - actual_coverage_days
        if gap_days > 0:
            coverage_gaps.append({
                "department_id": did,
                "department_name": dept_names[did],
                "missing_coverage_days": gap_days,
                "covered_days": actual_coverage_days,
                "total_days": expected_coverage_days,
                "coverage_pct": round(actual_coverage_days / expected_coverage_days * 100, 1),
            })

    # --- under-staffed departments -------------------------------------------
    avg_shifts_per_dept = sum(dept_shifts.values()) / max(len(dept_shifts), 1)
    low_staffed_depts = [
        {
            "department_id": did,
            "department_name": dept_names[did],
            "total_shifts": dept_shifts[did],
            "avg_shifts": round(avg_shifts_per_dept, 1),
        }
        for did in dept_shifts
        if dept_shifts[did] < avg_shifts_per_dept * 0.5  # > 50% below average
    ]

    # --- top-level KPIs ------------------------------------------------------
    total_staff = len(staff_hours_total)
    total_shifts = len(rows)
    total_hours = round(sum(staff_hours_total.values()), 1)
    avg_hours_per_staff = round(total_hours / max(total_staff, 1), 1)
    avg_shifts_per_staff = round(total_shifts / max(total_staff, 1), 1)

    busiest_dept_id = max(dept_shifts, key=dept_shifts.get) if dept_shifts else None
    quietest_dept_id = min(dept_shifts, key=dept_shifts.get) if dept_shifts else None

    kpis = {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "total_days_covered": total_days,
        "total_staff_rostered": total_staff,
        "total_shifts": total_shifts,
        "total_hours_rostered": total_hours,
        "avg_hours_per_staff": avg_hours_per_staff,
        "avg_shifts_per_staff": avg_shifts_per_staff,
        "departments_monitored": len(dept_names),
        "busiest_department": dept_names.get(busiest_dept_id, "N/A") if busiest_dept_id else "N/A",
        "quietest_department": dept_names.get(quietest_dept_id, "N/A") if quietest_dept_id else "N/A",
    }

    # --- narrative -----------------------------------------------------------
    period_label = {
        "weekly": "week",
        "monthly": "month",
        "quarterly": "quarter",
        "yearly": "year",
    }.get(period, "period")

    narrative_parts = [
        f"## AI Roster Report — {period.capitalize()} Summary",
        f"**Period:** {start_date} to {end_date}  |  **{total_staff} staff members** rostered across "
        f"**{len(dept_names)} department(s)**.",
        f"A total of **{total_shifts} shifts** were scheduled, amounting to **{total_hours} staff-hours** "
        f"over the {period_label}. On average, each staff member worked "
        f"**{avg_hours_per_staff} hours** across **{avg_shifts_per_staff} shifts**.",
    ]

    if busiest_dept_id:
        narrative_parts.append(
            f"The busiest department was **{dept_names[busiest_dept_id]}** "
            f"with {dept_shifts[busiest_dept_id]} shift(s) scheduled."
        )

    # warnings
    if burnout_staff:
        narrative_parts.append(
            f"\n### ⚠️ Burnout Risks Detected ({len(burnout_staff)} instance(s))"
        )
        for b in burnout_staff[:5]:  # cap to 5 to keep report readable
            narrative_parts.append(
                f"- **{b['staff_name']}** ({b['role']}) worked **{b['hours']} hours** in "
                f"week {b['week']}, which is {b['excess_hours']} hours above the recommended 48-hour limit."
            )
    else:
        narrative_parts.append("\n### ✅ No Burnout Risks Detected")
        narrative_parts.append("All staff members worked within sustainable hour limits for this period.")

    # coverage gaps
    if coverage_gaps:
        narrative_parts.append(
            f"\n### 📋 Coverage Gaps Identified ({len(coverage_gaps)} department(s))"
        )
        for g in coverage_gaps:
            narrative_parts.append(
                f"- **{g['department_name']}** had roster coverage on only {g['covered_days']} of "
                f"{g['total_days']} working days ({g['coverage_pct']}%). "
                f"Consider scheduling staff for the {g['missing_coverage_days']} uncovered day(s)."
            )
    else:
        narrative_parts.append("\n### ✅ Full Coverage Achieved")
        narrative_parts.append("All departments had at least one staff member rostered for every day in this period.")

    # optimizations
    optimizations: List[str] = []
    if low_staffed_depts:
        for dept in low_staffed_depts:
            optimizations.append(
                f"Consider increasing staffing in **{dept['department_name']}** — "
                f"it has only {dept['total_shifts']} shift(s) vs. the clinic average of {dept['avg_shifts']}."
            )

    if burnout_staff:
        optimizations.append(
            "Redistribute shifts among available staff to reduce overtime exposure and prevent fatigue."
        )

    if not optimizations:
        optimizations.append("Roster balance is within healthy parameters. No immediate action required.")

    if optimizations:
        narrative_parts.append("\n### 💡 Optimization Recommendations")
        for tip in optimizations:
            narrative_parts.append(f"- {tip}")

    narrative = "\n".join(narrative_parts)

    # --- per-dept breakdown --------------------------------------------------
    department_breakdown = [
        {
            "department_id": did,
            "department_name": dept_names[did],
            "total_shifts": dept_shifts[did],
            "total_hours": round(dept_hours[did], 1),
            "days_covered": len(dept_dates[did]),
        }
        for did in dept_names
    ]
    department_breakdown.sort(key=lambda x: x["total_shifts"], reverse=True)

    # --- per-staff breakdown -------------------------------------------------
    staff_breakdown = [
        {
            "staff_id": sid,
            "staff_name": staff_names[sid],
            "role": staff_roles[sid],
            "total_shifts": staff_shifts[sid],
            "total_hours": round(staff_hours_total[sid], 1),
        }
        for sid in staff_names
    ]
    staff_breakdown.sort(key=lambda x: x["total_hours"], reverse=True)

    return {
        "kpis": kpis,
        "narrative": narrative,
        "warnings": {
            "burnout_risks": burnout_staff,
            "coverage_gaps": coverage_gaps,
            "low_staffed_departments": low_staffed_depts,
        },
        "optimizations": optimizations,
        "department_breakdown": department_breakdown,
        "staff_breakdown": staff_breakdown,
    }


def _empty_report(start_date: str, end_date: str, period: str) -> Dict[str, Any]:
    return {
        "kpis": {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "total_staff_rostered": 0,
            "total_shifts": 0,
            "total_hours_rostered": 0,
        },
        "narrative": (
            "## AI Roster Report\n\n"
            f"No published roster assignments were found for the selected {period} period "
            f"({start_date} to {end_date}).\n\n"
            "Please ensure rosters are published before generating an AI report."
        ),
        "warnings": {"burnout_risks": [], "coverage_gaps": [], "low_staffed_departments": []},
        "optimizations": ["Publish roster days to enable AI analysis."],
        "department_breakdown": [],
        "staff_breakdown": [],
    }
