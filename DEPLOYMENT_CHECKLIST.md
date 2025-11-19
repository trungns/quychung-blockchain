# Deployment Checklist

## Pre-Deployment

### 1. Code Quality
- [ ] Code đã được review
- [ ] Không có hardcoded secrets/credentials
- [ ] Không có console.log/debug statements không cần thiết
- [ ] Error handling đầy đủ
- [ ] Input validation đầy đủ

### 2. Testing
- [ ] Test manual tất cả flows chính
- [ ] Test edge cases (empty data, invalid input)
- [ ] Test với nhiều users/roles khác nhau
- [ ] Test trên nhiều browsers (nếu frontend)

### 3. Dependencies
- [ ] `go.mod` và `go.sum` đã được tidy
- [ ] `package-lock.json` đã được update (nếu có thay đổi frontend)
- [ ] Không có dependency conflicts

### 4. Database
- [ ] Schema changes đã được documented
- [ ] Migrations (nếu có) đã được test
- [ ] Indexes đã được thêm cho các query lớn
- [ ] Backup database trước khi deploy (production)

### 5. Environment Variables
- [ ] Tất cả env vars cần thiết đã được list
- [ ] Giá trị đã được cấu hình trên Devtron/K8s Secrets
- [ ] Không commit `.env` file lên Git

### 6. Docker Build
- [ ] Dockerfile build thành công locally (nếu có Docker)
- [ ] Image size reasonable (< 200MB nếu có thể)
- [ ] Multi-stage build để giảm size
- [ ] .dockerignore đã được configure đúng

---

## Deployment Process

### Step 1: Git Commit

```bash
# Review changes
git status
git diff

# Stage changes
git add <files>

# Commit với message rõ ràng
git commit -m "type: Short description

Detailed explanation of changes:
- Change 1
- Change 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Verify commit
git log -1
```

**Commit Message Types**:
- `feat`: Tính năng mới
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `test`: Adding tests
- `chore`: Build/config changes

### Step 2: Push to Git

```bash
# Push
git push origin main

# Verify push
git log origin/main -1
```

### Step 3: Monitor Devtron Build

- [ ] Vào Devtron Dashboard: https://devtron.wellytech.vn
- [ ] Chọn application `quy-chung-dev`
- [ ] Xem tab "Build & Deploy"
- [ ] Monitor CI pipeline:
  - Docker build starting
  - Dependencies installation
  - Frontend build
  - Backend build
  - Docker image push
  - Deployment to K8s

**Expected Timeline**:
- Frontend build: 2-3 phút
- Backend build: 1-2 phút
- Docker push: 1 phút
- K8s deployment: 1 phút
- **Total**: ~5-10 phút

### Step 4: Verify Deployment

#### 4.1 Check Pod Status
- [ ] Pod status = Running
- [ ] No CrashLoopBackOff
- [ ] No ImagePullBackOff

#### 4.2 Check Pod Logs
Tìm các log quan trọng:

```
✅ Database connection established successfully
✅ Running database migrations...
✅ Database migrations completed successfully
✅ DEBUG: Attempting to load contracts/TreasuryLogger.json
✅ DEBUG: Successfully read contract file, size: 7195 bytes
✅ DEBUG: Contract address: 0xF95395e8eFc43AA57Ef518d423AeC58f8722944e
✅ DEBUG: Contract ABI parsed successfully
✅ Server starting on port 8080
✅ API available at: http://localhost:8080/api
✅ Frontend available at: http://localhost:8080
```

**Red Flags** (cần investigate):
```
❌ ERROR: Cannot read contracts/ directory
❌ Warning: Contract not loaded
❌ Failed to connect to database
❌ panic: runtime error
❌ CrashLoopBackOff
```

#### 4.3 Test Production URL
- [ ] Access https://quychung.wellytech.vn
- [ ] Login với Google
- [ ] Navigate các pages chính
- [ ] Check browser console (no errors)

#### 4.4 Test Critical Flows

**Flow 1: Create Transaction**
- [ ] Vào một treasury
- [ ] Click "Nhập thu"
- [ ] Nhập amount và note
- [ ] Submit form
- [ ] Verify transaction xuất hiện trong list
- [ ] Đợi 10-20 giây
- [ ] Refresh page
- [ ] Verify status = "confirmed" và có tx_hash
- [ ] Click tx_hash link → mở PolygonScan
- [ ] Verify transaction trên blockchain

**Flow 2: View Reports**
- [ ] Click "Báo cáo"
- [ ] Verify charts hiển thị
- [ ] Verify data đúng

**Flow 3: Add Member**
- [ ] Click "Thêm thành viên"
- [ ] Nhập email
- [ ] Verify member xuất hiện trong list

---

## Post-Deployment

### 1. Monitor for 15 minutes
- [ ] Watch pod logs for errors
- [ ] Check CPU/Memory usage (Devtron Monitoring tab)
- [ ] Monitor error rate

### 2. Notify Team
```
✅ Deployment thành công
Version: <git-commit-hash>
Changes:
- <list of changes>

Tested:
- ✅ Create transaction
- ✅ Blockchain logging
- ✅ Reports

Production URL: https://quychung.wellytech.vn
```

### 3. Document Changes
- [ ] Update CHANGELOG.md (nếu có)
- [ ] Update documentation (nếu có thay đổi API)
- [ ] Update README.md (nếu có thay đổi setup)

---

## Rollback Procedure

**Khi nào cần rollback**:
- Critical bug xuất hiện
- Performance giảm đáng kể
- Data corruption
- Security issue

**Cách rollback**:

### Option 1: Git Revert (Recommended)
```bash
# Revert commit gần nhất
git revert HEAD

# Hoặc revert commit cụ thể
git revert <commit-hash>

# Push
git push origin main

# Devtron sẽ auto-build và deploy version rollback
```

### Option 2: Devtron UI Rollback
1. Vào Devtron Dashboard
2. Click "App Details"
3. Tab "Deployment History"
4. Chọn version trước đó (working version)
5. Click "Rollback"
6. Confirm

**Sau khi rollback**:
- [ ] Verify old version đang chạy
- [ ] Test critical flows
- [ ] Investigate root cause của issue
- [ ] Fix issue trên branch riêng
- [ ] Test kỹ trước khi deploy lại

---

## Emergency Procedures

### Pod Stuck in CrashLoopBackOff

**Debug**:
```bash
# Get pod name
kubectl get pods -n <namespace>

# Get logs
kubectl logs <pod-name> -n <namespace>

# Describe pod
kubectl describe pod <pod-name> -n <namespace>
```

**Common Causes**:
1. Database connection failed
   - Fix: Check DB secrets
2. Missing env var
   - Fix: Add secret on Devtron
3. Port conflict
   - Fix: Check service config
4. Out of memory
   - Fix: Increase memory limit

### Database Connection Issues

**Verify**:
```bash
# From pod
kubectl exec -it <pod-name> -n <namespace> -- sh
nc -zv <db-host> 5432

# From local (nếu có VPN)
psql -h <db-host> -U <db-user> -d <db-name>
```

**Fix**:
- Check security groups (AWS)
- Check DB credentials
- Check DB is running

### Blockchain Logging Failed

**Debug**:
1. Check pod logs cho "ERROR: Failed to log transaction"
2. Kiểm tra chi tiết error:
   - "Contract not loaded" → Check file exists
   - "failed to send transaction" → Check RPC URL
   - "insufficient funds" → Check wallet gas
   - "method not found" → Check ABI

**Fix**:
- Ensure `contracts/TreasuryLogger.json` in Git
- Verify BLOCKCHAIN_RPC env var
- Request testnet MATIC: https://faucet.polygon.technology/
- Verify contract ABI matches deployed contract

---

## Health Check Endpoints

### Backend Health
```bash
curl https://quychung.wellytech.vn/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T10:30:00Z"
}
```

### Database Health
```bash
# Inside pod
kubectl exec <pod-name> -n <namespace> -- \
  sh -c 'echo "SELECT 1" | psql $DATABASE_URL'
```

---

## Performance Benchmarks

### Expected Response Times
- Auth: < 500ms
- Get Treasuries: < 200ms
- Get Transactions: < 300ms
- Create Transaction: < 500ms (database only, blockchain async)
- Reports: < 1s

### Resource Usage (per pod)
- CPU: < 100m (normal), < 500m (peak)
- Memory: < 200Mi (normal), < 500Mi (peak)

**Action if exceeded**:
- Add database indexes
- Optimize queries
- Enable caching
- Scale horizontally (increase replicas)

---

## Security Checklist

### Before Production
- [ ] Secrets không bị commit
- [ ] CORS configured chính xác
- [ ] Rate limiting (future)
- [ ] Input validation đầy đủ
- [ ] SQL injection prevention (GORM parameterized queries)
- [ ] XSS prevention (React auto-escape)
- [ ] HTTPS enforced
- [ ] JWT expiration configured

### Regular Audits
- [ ] Review access logs monthly
- [ ] Update dependencies quarterly
- [ ] Security scan với `go vet`, `npm audit`
- [ ] Review Kubernetes RBAC

---

## Contacts

### Emergency Contacts
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Backend Lead**: [Name] - [Phone] - [Email]
- **Product Owner**: [Name] - [Phone] - [Email]

### External Services
- **AWS Support**: https://console.aws.amazon.com/support/
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Polygon RPC Status**: https://status.polygon.technology/
- **Google OAuth Console**: https://console.cloud.google.com/

---

## Deployment Log Template

```markdown
## Deployment: [Date] [Time]

**Version**: [git-commit-hash]
**Deployed by**: [Your Name]
**Environment**: Production

### Changes
- [Change 1]
- [Change 2]

### Pre-Deploy Checks
- [x] Code reviewed
- [x] Tests passed
- [x] Env vars configured
- [x] Database backup taken

### Deployment
- Started: [Time]
- Build completed: [Time]
- Deployment completed: [Time]
- Total duration: [X minutes]

### Post-Deploy Verification
- [x] Pod status: Running
- [x] Logs: No errors
- [x] Create transaction: ✅ Success
- [x] Blockchain logging: ✅ Success
- [x] Reports: ✅ Working

### Issues
- None / [List issues if any]

### Rollback Plan
- Rollback commit: [previous-commit-hash]
- Rollback procedure: Git revert / Devtron UI
```

---

*Deployment Checklist - Cập nhật lần cuối: 2025-01-19*
