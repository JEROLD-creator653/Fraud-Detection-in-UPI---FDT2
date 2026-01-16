# UPI Fraud Detection - Setup and Run Script
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "UPI Fraud Detection - Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "[1/7] Installing Python dependencies..." -ForegroundColor Yellow
pip install numpy scikit-learn scipy xgboost matplotlib seaborn joblib redis psycopg2-binary fastapi uvicorn pydantic sqlalchemy pyyaml passlib faker requests

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Start Docker services
Write-Host "[2/7] Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 5
Write-Host "PostgreSQL and Redis are ready" -ForegroundColor Green
Write-Host ""

# Step 3: Initialize database
Write-Host "[3/7] Initializing database schema..." -ForegroundColor Yellow
python scripts/check_schema.py
Write-Host ""

# Step 4: Train models
Write-Host "[4/7] Training ML models (this takes 2-5 minutes)..." -ForegroundColor Yellow
if (-not (Test-Path "models/xgboost.joblib")) {
    python train_models.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Model training failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Models trained successfully" -ForegroundColor Green
} else {
    Write-Host "Models already exist (skipping training)" -ForegroundColor Green
}
Write-Host ""

# Step 5: Evaluate models
Write-Host "[5/7] Evaluating models..." -ForegroundColor Yellow
python evaluate_model.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "Evaluation complete" -ForegroundColor Green
}
Write-Host ""

# Step 6: Feature importance
Write-Host "[6/7] Analyzing feature importance..." -ForegroundColor Yellow
python feature_importance.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "Feature analysis complete" -ForegroundColor Green
}
Write-Host ""

# Step 7: Ready
Write-Host "[7/7] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "READY TO RUN" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the API server, run:" -ForegroundColor White
Write-Host "  uvicorn app.main:app --reload --port 8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test with simulator (in another terminal):" -ForegroundColor White
Write-Host "  python simulator/generator.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "To view the dashboard, open:" -ForegroundColor White
Write-Host "  http://localhost:8000/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "All ML improvements are ready!" -ForegroundColor Green
