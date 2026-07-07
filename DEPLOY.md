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
