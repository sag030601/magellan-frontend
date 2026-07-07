# CI/CD — Frontend (magellan-frontend)

Pushing to **`main`** runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), builds the app, and deploys to EC2.

## Flow

1. `npm ci && npm run build` (uses `.env.production` for `VITE_API_URL`)
2. Rsync `dist/` to `/home/ec2-user/app/client`
3. `docker compose restart web`

## GitHub secrets

Add these under **Settings → Secrets and variables → Actions** for `magellan-frontend`:

| Secret | Example | Required |
|--------|---------|----------|
| `EC2_HOST` | `65.0.24.25` or your domain | Yes |
| `EC2_USER` | `ec2-user` | Yes |
| `EC2_SSH_KEY` | Full private key (PEM) | Yes |
| `DEPLOY_PATH` | `/home/ec2-user/app` | No (default shown) |
| `VITE_API_URL` | `https://www.zivyamarine.com` | No (falls back to `.env.production`) |

## One-time server setup

On EC2, nginx serves static files from `/home/ec2-user/app/client`:

```bash
mkdir -p /home/ec2-user/app/client
cd /home/ec2-user/app && docker compose up -d web
```

## Manual deploy

**Actions → Deploy Frontend → Run workflow**

## Notes

- Production API URL is set in `.env.production` (`VITE_API_URL=https://www.zivyamarine.com`).
- Override at build time with the `VITE_API_URL` secret if needed.
