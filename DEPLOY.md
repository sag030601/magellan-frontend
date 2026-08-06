# CI/CD — SSH deploy (safe)

Same setup as **magellan_backend** — see `DEPLOY.md` in the server repo.

## GitHub secrets

- `EC2_HOST` = `65.0.24.25`
- `EC2_USER` = `ec2-user`
- `EC2_SSH_KEY_B64` = base64 of `~/.ssh/magellan_deploy` private key
- `DEPLOY_PATH` = `/home/ec2-user/app` (optional)

## Safe deploy rules

- `server/.env` and `uploads/` are never overwritten
- `authorized_keys` is never modified by CI
- Client rsync does not delete existing files on the server

## Fix 413 "Request Entity Too Large" on uploads

Document uploads are limited to **20 MB per file** in the app. Nginx defaults to **1 MB** and returns **413** before the request reaches Node.

`client_max_body_size` caps the **whole request body**, not each file. The Proposal form can post five 20 MB documents at once, so the limit must be **105m**, not 21m.

**If you use Docker `magellan-web` (port 8080):** deploy syncs `deploy/nginx/default.conf` with `client_max_body_size 105m`. After deploy, restart web:

```bash
cd /home/ec2-user/app && docker compose up -d web
```

**If you use host nginx on EC2** (error page shows `nginx/1.20.x`), edit the site config on the server:

```bash
sudo grep -rn "client_max_body_size\|server_name" /etc/nginx/conf.d/ /etc/nginx/nginx.conf
sudo nano /etc/nginx/conf.d/magellan.conf   # or your actual config path
```

Add inside the `server { }` block:

```nginx
client_max_body_size 105m;
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Note: host nginx and the Docker web container are separate. If requests pass through both, **both** need the directive.

See `deploy/nginx/ec2-host.conf.example` for a full example.
