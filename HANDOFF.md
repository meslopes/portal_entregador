# muv.log — Handoff Document for New MiMo Instance

## Context

This is a delivery management system (muv.log) built with Flask + SQLAlchemy (backend) and React + Vite (frontend). The system is in practical testing phase. The previous session made significant progress but hit a Vercel build failure that needs immediate attention.

---

## IMMEDIATE ACTION: Fix Vercel Build Failure

### Problem
The Vercel build fails with JSX syntax error "Expected '>' but found '<'" on line 588 of some file. The build works locally but fails on Vercel.

### Files Recently Modified (check these first)
1. `portal-frontend/src/pages/admin/PlatformDashboardPage.jsx` — added "Mapa do Banco" button
2. `portal-frontend/src/pages/client/ClientOrdersPage.jsx` — added edit modal
3. `portal-frontend/src/pages/admin/OrderDetailPage.jsx` — added edit modal

### How to Fix
1. Run `npm run build` in `portal-frontend/` to verify local build works
2. Check each modified file for unclosed JSX tags
3. The error "Expected '>' but found '<'" means a tag is malformed
4. Fix any syntax issues, commit, push, and deploy

### Deploy Commands
```bash
# In portal_entregador/
git add -A && git commit -m "fix: JSX syntax error" && git push origin main

# In portal_entregador/portal-frontend/
npx vercel --prod --yes
```

---

## System Architecture

### Backend
- **Framework:** Flask + SQLAlchemy
- **Database:** PostgreSQL (Render)
- **Deploy:** Render free tier (`https://muvlog-api.onrender.com`)
- **Entry point:** `portal-backend/src/main_production.py`

### Frontend
- **Framework:** React + Vite
- **Deploy:** Vercel (`https://portal-frontend-sepia.vercel.app`)
- **Entry point:** `portal-frontend/src/App.jsx`

### Key Files
| File | Purpose |
|------|---------|
| `portal-backend/src/routes/admin.py` | Admin endpoints |
| `portal-backend/src/routes/order.py` | Order management |
| `portal-backend/src/routes/own_driver.py` | Own driver endpoints |
| `portal-backend/src/routes/finance.py` | Financial reports & subscriptions |
| `portal-backend/src/routes/route.py` | Route optimization |
| `portal-backend/src/routes/auth.py` | Authentication |
| `portal-backend/src/models/portal_models.py` | All database models |
| `portal-backend/src/services/asaas_service.py` | Asaas payment integration |
| `portal-backend/src/services/geocoding.py` | Geocoding + OSRM routing |
| `portal-backend/src/utils/tenant.py` | Multi-tenant utilities |
| `portal-frontend/src/lib/api.js` | Axios instance + interceptors |

---

## Credentials

| Role | Email/Phone | Password/PIN | Tenant |
|------|-------------|--------------|--------|
| Super Admin | meslopes@gmail.com | admin123 | None (Platform) |
| Admin muv.log | emmanuelboeslopes@outlook.com | 123456 | muv.log (ID:1) |

---

## Access URLs

| Role | URL |
|------|-----|
| Super Admin | `https://portal-entregador-gamma.vercel.app/login` |
| Admin | `https://portal-entregador-gamma.vercel.app/login` |
| Establishment | `https://portal-entregador-gamma.vercel.app/client/login` |
| Own Driver | `https://portal-entregador-gamma.vercel.app/own-driver/login` |
| Platform Driver | `https://portal-entregador-gamma.vercel.app/login` |
| Database Map | `https://portal-entregador-gamma.vercel.app/admin/database-map` |

---

## Completed Features (T1-T36)

| # | Feature | Status |
|---|---------|--------|
| T1 | Fix 500 on register-pin | ✅ |
| T2 | Map: delivery addresses for own-driver orders | ✅ |
| T3 | Praça/tenant/driver type info | ✅ |
| T4 | Frontend PIN registration error handling | ~~✅~~ |
| T5 | Payment config bug (values sync) | ✅ |
| T6 | Own-driver dashboard update button | ✅ |
| T7 | Proof of delivery photo in order details | ✅ |
| T8 | Expanded payment methods (FIXED_PLUS_DELIVERY, FIXED_UP_TO_PLUS_DELIVERY) | ✅ |
| T9 | Geocoding: removed aggressive city center fallback | ✅ |
| T10 | Accept/reject mechanism for own drivers (OFFERED status) | ✅ |
| T11 | Show delivery fee before sending order | ✅ |
| T12 | Own driver performance metrics | ✅ |
| T13 | Route optimization for own drivers | ✅ |
| T14 | Payment reports by frequency + pay by period | ✅ |
| T15 | Subscription billing (weekly/monthly) | ✅ |
| T16 | Asaas integration for automatic PIX charges | ✅ |
| T17 | Asaas webhook for subscription invoices | ✅ |
| T18 | JWT expires in 24h | ✅ |
| T19 | Own driver withdrawal flow via PIX | ✅ |
| T20 | Invoice expiration notifications + overdue report | ✅ |
| T21-T33 | Code review fixes (43 WARNINGs fixed) | ✅ |
| T34 | System manual (MD + PDF) | ✅ |
| T35 | Fix routes page 401 for own drivers | ✅ |
| T36 | Order editing (backend + frontend) | ✅ |

---

## Pending Items (Post-Testing)

| # | Item | Priority |
|---|------|----------|
| 1 | Rate limiting (flask-limiter) | Medium |
| 2 | Migration versioning (Alembic) | Low |
| 
---



## Known Issues

1. **Vercel build failure** — JSX syntax error, needs immediate fix
2. **Polling when offline** — `/api/orders/available` polls even when driver is offline (silenced by returning empty list, but still wastes battery)
3. **Geocoding fallback** — still has hardcoded Capão da Canoa fallback for some addresses
4. **database_map performance** — loads all records into memory (needs pagination)

---

## Working Style Rules

1. **Language:** Respond in Portuguese
2. **Deploy:** Always deploy frontend to Vercel after push; user handles Render manually
3. **Don't break working things:** "o sistema como está nessa fase já é muito bom"
4. **Verify changes:** "verifique a cada modificação que fizer se isso não afeta outra parte do sistema"
5. **Ask if unsure:** "se tiver alguma duvida me questione"

---

## Next Steps for New Instance

1. **Fix Vercel build** — check JSX syntax in recently modified files
2. **Deploy** — `npx vercel --prod --yes` in `portal-frontend/`
3. **Wait for user** — they will continue testing and report issues
4. **Fix issues as reported** — be careful not to break working features
