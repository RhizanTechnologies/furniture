# Operational Runbook & Maintenance Guide

This document defines standard operating procedures, backup routines, disaster recovery steps, and incident response for the Furniture Business ERP.

---

## 1. Routine Backups & Retention Policies

### Automated PostgreSQL Backup Script
Deploy a daily cron job on the production server executing `scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/furniture-erp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/furniture_erp_$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $FILENAME"
docker exec -t furniture_erp_postgres_prod pg_dump -U furniture_prod_user -F c -b -v -f "/tmp/backup.dump" furniture_prod_erp
docker cp furniture_erp_postgres_prod:/tmp/backup.dump "$FILENAME"
docker exec -t furniture_erp_postgres_prod rm -f /tmp/backup.dump

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "furniture_erp_*.dump" -mtime +30 -delete

echo "Backup complete: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
```

### Object Storage (MinIO / S3) Synchronization
Back up uploaded product photos and order attachments using AWS CLI or MinIO Client (`mc`):
```bash
mc mirror --overwrite local_minio/furniture-erp-uploads offsite_s3/furniture-erp-backups/uploads/
```

### Backup Frequency & Retention
| Asset | Frequency | Retention | Storage Location |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | Hourly incremental / Daily full | 30 days daily, 12 months monthly | Encrypted remote S3 / Cold storage |
| **Uploaded Media Files** | Daily mirror | Indefinite (synced with DB retention) | Off-site S3 Glacier / Backblaze B2 |

---

## 2. Disaster Recovery & Restoration Procedures

### Database Restoration from Dump
1. Stop the application API to prevent write contention:
   ```bash
   docker compose -f docker-compose.prod.yml stop api
   ```
2. Drop existing schema / terminate active connections:
   ```bash
   docker exec -it furniture_erp_postgres_prod psql -U furniture_prod_user -d postgres -c \
     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'furniture_prod_erp' AND pid <> pg_backend_pid();"
   docker exec -it furniture_erp_postgres_prod dropdb -U furniture_prod_user furniture_prod_erp
   docker exec -it furniture_erp_postgres_prod createdb -U furniture_prod_user -O furniture_prod_user furniture_prod_erp
   ```
3. Copy and restore dump:
   ```bash
   docker cp /var/backups/furniture-erp/furniture_erp_YYYYMMDD_HHMMSS.dump furniture_erp_postgres_prod:/tmp/restore.dump
   docker exec -it furniture_erp_postgres_prod pg_restore -U furniture_prod_user -d furniture_prod_erp -v /tmp/restore.dump
   docker exec -it furniture_erp_postgres_prod rm -f /tmp/restore.dump
   ```
4. Restart application API:
   ```bash
   docker compose -f docker-compose.prod.yml start api
   ```

---

## 3. Healthchecks, Telemetry & Monitoring

### Endpoints
- **Application Health**: `GET /api/v1/health`
  - Returns `{"status":"ok","timestamp":"...","database":"connected","version":"0.1.0"}` with HTTP 200.
  - Return HTTP 503 if PostgreSQL connectivity drops.

### Server Resource Thresholds
- **CPU Utilization**: Alert when sustained > 80% for 10 minutes.
- **RAM Utilization**: Alert when sustained > 85% for 5 minutes.
- **Disk Usage (`/var/lib/docker`)**: Alert when volume utilization exceeds 80%.

---

## 4. Offline Synchronization Operations & Troubleshooting

### Client Outbox Inspection
- When users experience connectivity gaps, mutations accumulate in Dexie.js IndexedDB `syncOutbox`.
- Upon reconnecting, `SyncService` drains the outbox in chronological dependency order (`createdAt ASC`).

### Handling Synchronization Conflicts
If a branch administrator submits a stale update:
1. The backend rejects conflicting records with `409 Conflict` and current server state.
2. The client triggers the `ConflictResolutionModal` where the operator can:
   - **Keep Local**: Forces override (if permissions permit).
   - **Accept Server**: Discards local mutation and updates local Dexie cache to match the server.

### Dead-Letter Outbox Queue
- If an item fails due to terminal validation (`400 Bad Request`), its `retryCount` increments.
- Items exceeding `maxRetries: 5` are tagged `status: 'failed'`.
- The user is alerted with a discrete badge `[Sync Failed - Action Required]` and can retry or export diagnostic logs.

---

## 5. Security Incident Response

1. **Suspected Compromised User Account**:
   - Update user password via Admin UI or SQL:
     ```sql
     UPDATE users SET is_active = false WHERE email = 'compromised@domain.com';
     ```
   - Rotating `JWT_SECRET` in `.env.production` immediately invalidates all active sessions across the entire fleet.
2. **Branch Access Auditing**:
   - Query all access logs in `activity_logs` or audit `payments`, `material_consumptions`, and `order_stage_histories` by `branch_id` and `created_by_user_id`.
