# Transaction Simulator Guide

## Overview

The FDT Transaction Simulator generates realistic transaction patterns to test the fraud detection system. It supports multiple transaction patterns with different risk profiles.

## Features

- ✅ Multiple transaction patterns (normal, suspicious, high_risk, burst)
- ✅ Realistic VPA generation (merchants, user names)
- ✅ Color-coded terminal output
- ✅ Real-time statistics tracking
- ✅ Supports both user and admin backends
- ✅ JWT authentication support
- ✅ Configurable transaction count and delay

## Quick Start

### 1. Get Authentication Token

```bash
# Login to get a token
TOKEN=$(curl -s -X POST http://localhost:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999", "password": "testpass123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
```

### 2. Run Simulator

```bash
# User mode (recommended) - sends via user backend
python simulator.py --token "$TOKEN" --count 10

# Admin mode - sends directly to admin dashboard
python simulator.py --mode admin --count 10
```

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | Backend URL | `http://localhost:8001/api/transaction` |
| `--mode` | Simulation mode (`user` or `admin`) | `user` |
| `--token` | Auth token for user mode | None (required for user mode) |
| `--pattern` | Specific pattern to test | Random |
| `--count` | Number of transactions | Infinite |
| `--delay` | Delay between transactions (seconds) | `0.5` |
| `--stats-interval` | Show stats every N transactions | `10` |

## Transaction Patterns

### 1. Normal (60% weight)
**Characteristics:**
- Amount: ₹50 - ₹2,000
- Mostly app channel
- Familiar devices
- Low new device probability (5%)

**Use case:** Regular day-to-day transactions

### 2. Suspicious (20% weight)
**Characteristics:**
- Amount: ₹2,000 - ₹8,000
- Mixed channels (web, QR)
- Often new devices (60%)
- Moderate risk

**Use case:** Testing DELAY action threshold

### 3. High Risk (10% weight)
**Characteristics:**
- Amount: ₹8,000 - ₹25,000
- Always new devices (UUID)
- Web/QR channels
- Very high risk

**Use case:** Testing BLOCK action threshold

### 4. Burst (10% weight)
**Characteristics:**
- Amount: ₹500 - ₹3,000
- Same users repeatedly
- Limited device set
- Velocity pattern

**Use case:** Testing transaction velocity detection

## Usage Examples

### Run 20 Normal Transactions
```bash
python simulator.py --token "$TOKEN" --pattern normal --count 20 --delay 0.5
```

### Test High-Risk Transactions
```bash
python simulator.py --token "$TOKEN" --pattern high_risk --count 5 --delay 1
```

### Continuous Simulation
```bash
python simulator.py --token "$TOKEN"
# Press Ctrl+C to stop
```

### Admin Mode (No Auth Required)
```bash
python simulator.py --mode admin --count 50
```

### Custom Backend URL
```bash
python simulator.py --url http://localhost:8001/api/transaction --token "$TOKEN"
```

## Output Format

The simulator provides color-coded output:

```
────────────────────────────────────────────────────────────────────────────────
Pattern:    ✅ Normal
TX ID:      tx_abc123def456
User:       user_042        Device: device_089
Amount:     ₹1,234.56    Type: P2M   Channel: app
Recipient:  amazon15@upi
Risk Score: 0.1234 (12.34%)
Action:     🟢 ALLOW
```

### Action Icons
- 🟢 **ALLOW** - Transaction approved (green)
- 🟡 **DELAY** - Transaction delayed for review (yellow)
- 🔴 **BLOCK** - Transaction blocked (red)
- ❌ **ERROR** - API error

### Statistics Display

Every N transactions (default: 10), the simulator displays stats:

```
════════════════════════════════════════════════════════════════════════════════
📊 Statistics (Total: 50)
  Allowed: 35 (70.0%)
  Delayed: 10 (20.0%)
  Blocked: 5 (10.0%)
════════════════════════════════════════════════════════════════════════════════
```

## Generated VPA Patterns

### Merchants
- amazon, flipkart, swiggy, zomato
- uber, ola, paytm, phonepe, gpay

### User Names
- rajesh, priya, amit, neha, suresh
- divya, rahul, pooja, vijay, sneha

Numbers are appended to make unique VPAs (e.g., `amazon15@upi`, `rajesh42@upi`)

## Demo Users for Testing

| Phone | Password | Balance |
|-------|----------|---------|
| +919999999999 | testpass123 | ₹10,000 |
| +919876543210 | password123 | ₹790 (limited) |

## Performance Tips

### High-Volume Testing
```bash
# Fast simulation (minimal delay)
python simulator.py --token "$TOKEN" --count 100 --delay 0.1 --stats-interval 20
```

### Load Testing
```bash
# Run multiple simulators in parallel
for i in {1..5}; do
  python simulator.py --token "$TOKEN" --count 50 --delay 0.2 &
done
wait
```

### Specific Pattern Testing
```bash
# Test only burst patterns
python simulator.py --token "$TOKEN" --pattern burst --count 30 --delay 0.05
```

## Troubleshooting

### "Missing or invalid authorization header"
**Solution:** Make sure you provide a valid JWT token with `--token`

```bash
# Get fresh token
TOKEN=$(curl -s -X POST http://localhost:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999", "password": "testpass123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

python simulator.py --token "$TOKEN"
```

### "Insufficient balance"
**Solution:** Use a test user with sufficient balance or use admin mode

```bash
# Register new test user
curl -X POST http://localhost:8001/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "phone": "+919999999998", "email": "test@example.com", "password": "password123"}'

# Or use admin mode (no balance check)
python simulator.py --mode admin --count 10
```

### Backend Not Responding
**Solution:** Make sure the backend is running

```bash
# Check backend status
curl http://localhost:8001/api/health

# Start backend if needed
bash start.sh
```

## Integration with Testing

### pytest Integration
```python
import subprocess
import time

def test_fraud_detection_with_simulator():
    # Run 10 transactions
    result = subprocess.run([
        "python", "simulator.py",
        "--token", get_auth_token(),
        "--pattern", "high_risk",
        "--count", "10"
    ], capture_output=True)
    
    assert result.returncode == 0
```

### Performance Benchmarking
```bash
# Measure throughput
time python simulator.py --token "$TOKEN" --count 100 --delay 0
```

## Advanced Usage

### Save Output to File
```bash
python simulator.py --token "$TOKEN" --count 50 > simulation_log.txt 2>&1
```

### Filter Blocked Transactions
```bash
python simulator.py --token "$TOKEN" | grep "BLOCK"
```

### Count Action Types
```bash
python simulator.py --token "$TOKEN" --count 100 | grep -E "ALLOW|DELAY|BLOCK" | sort | uniq -c
```

## Development

The simulator is located at: `simulator.py`

To modify patterns or add new ones, edit the `PATTERNS` dictionary in the source code.

## See Also

- [HOW_TO_RUN.md](HOW_TO_RUN.md) - Application running guide
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick command reference
- [TEST_REPORT.md](TEST_REPORT.md) - Comprehensive test results

---

**Last Updated:** January 2026  
**Version:** 2.0 (Enhanced)
