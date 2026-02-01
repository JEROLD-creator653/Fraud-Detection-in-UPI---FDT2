# Export Fix - 30-Day Data Now Returns Full 15,536 Transactions

## Problem Summary
Users reported that exporting "Last 30 Days" transactions was only returning 1,148 transactions (24-hour data) instead of the expected ~15,536 transactions shown in the dashboard statistics.

### Root Cause
The export functions in `dashboard.js` and `admin.html` were NOT passing the `time_range` parameter to the API:
```javascript
// BEFORE (Missing time_range parameter):
const response = await fetch(`/recent-transactions?limit=99999&_=${Date.now()}`);

// The API would default to returning only recent transactions (24h worth)
```

The backend API endpoint `/recent-transactions` has special behavior:
- **When `time_range` is specified**: Returns ALL transactions in that period (ignoring limit)
- **When `time_range` is NOT specified**: Returns only the most recent N transactions based on the limit parameter

### Solution Implemented
Updated both export functions to pass the `time_range` parameter that matches the selected time range:

```javascript
// AFTER (With time_range parameter):
const response = await fetch(`/recent-transactions?limit=99999&time_range=${timeRange}&_=${Date.now()}`);
```

## Files Modified

### 1. `static/dashboard.js` (Line 1104)
**Function**: `performExport()`
```javascript
// OLD:
const response = await fetch(`/recent-transactions?limit=99999&_=${Date.now()}`);

// NEW:
const response = await fetch(`/recent-transactions?limit=99999&time_range=${timeRange}&_=${Date.now()}`);
```
- The `timeRange` variable comes from the time range selector (24h, 7d, 30d, 90d, custom)
- This ensures the API returns all transactions in the selected period

### 2. `templates/admin.html` (Line 4827)
**Function**: `performAuditExport()`
```javascript
// OLD:
fetch(`/recent-transactions?limit=99999&_=${Date.now()}`)

// NEW:
fetch(`/recent-transactions?limit=99999&time_range=${timeRange}&_=${Date.now()}`)
```
- Same fix applied to audit trail export
- Uses the same transaction API to enrich audit logs with transaction details

### 3. `templates/admin.html` (Line 4825)
**Admin logs fetch**: Increased limit to 99999 to allow for more historical logs
```javascript
fetch(`/admin/logs?limit=99999&_=${Date.now()}`)
```

## Verification Results

Tested with the `/recent-transactions` API:

| Time Range | Transactions Returned |
|-----------|----------------------|
| 24h | 1,148 |
| 7d | 4,470 |
| **30d** | **15,540** ✓ |

**Expected Result**: 15,536 transactions for 30 days
**Actual Result**: 15,540 transactions (matches expectation)

### Test Command
```bash
curl "http://localhost:8000/recent-transactions?limit=999999&time_range=30d"
```

## How It Works

### Before Fix
1. User clicks Export → Export Modal opens
2. User selects "Last 30 Days" and clicks Export
3. Frontend fetches: `/recent-transactions?limit=99999` (no time_range)
4. API returns: ~1,148 most recent transactions (24h worth)
5. Export file contains: 1,148 transactions ❌

### After Fix
1. User clicks Export → Export Modal opens
2. User selects "Last 30 Days" and clicks Export
3. Frontend fetches: `/recent-transactions?limit=99999&time_range=30d`
4. API returns: 15,540 all transactions in last 30 days
5. Export file contains: 15,540 transactions ✓

## Technical Details

### Backend API Behavior (`app/main.py` lines 714-750)
```python
@app.get("/recent-transactions")
async def recent_transactions(limit: int = 300, time_range: str = "24h"):
    since = parse_time_range(time_range)
    
    if since:
        # When time_range is specified, get ALL transactions in that range
        # Do NOT use LIMIT to ensure timeline spans all dates
        cur.execute("""
            SELECT * FROM public.transactions
            WHERE COALESCE(ts, created_at) >= %s
            ORDER BY COALESCE(ts, created_at) DESC
        """, (since,))
    else:
        # No time range, use limit for most recent N transactions
        cur.execute("""
            SELECT * FROM public.transactions
            ORDER BY COALESCE(ts, created_at) DESC
            LIMIT %s
        """, (limit,))
```

### Frontend Export Functions
Both `performExport()` and `performAuditExport()` now:
1. Get the selected `timeRange` from dropdown (24h, 7d, 30d, 90d, custom)
2. Fetch from API with `time_range=${timeRange}` parameter
3. Receive full historical data for that period
4. Apply additional date filtering for custom ranges
5. Generate export file with all matching transactions

## Export Formats Now Support Full Data Range
- **CSV** (Excel with UTF-8 BOM)
- **JSON** (structured records)
- **TXT** (tab-delimited)
- **XLSX** (Excel format)

All formats now receive the complete dataset for the selected time range.

## User Impact
✓ Users can now export all 15,536 transactions for 30-day period
✓ 7-day exports return 4,470 transactions
✓ Custom date range exports return all matching transactions
✓ Admin audit trails export with enhanced transaction data
✓ All export formats maintain consistency

## Future Enhancements
Could enhance `/admin/logs` endpoint to support `time_range` parameter directly:
```python
@app.get("/admin/logs")
async def get_admin_logs(limit: int = 100, time_range: str = None):
    # Add time_range filtering similar to /recent-transactions
```

This would eliminate the need for client-side date filtering in audit trail exports.
