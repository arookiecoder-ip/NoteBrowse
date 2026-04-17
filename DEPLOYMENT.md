# NoteBrowse Production Deployment Guide

This guide covers deploying the NoteBrowse application to a Linux server alongside an existing website, using Docker Compose and setting up Nginx as a reverse proxy for a dedicated subdomain (with automated SSL).

## Prerequisites
1. A Linux Server (Ubuntu/Debian) where you already have Nginx running.
2. A registered domain name pointing to the server.
3. An A-Record created in your DNS provider for your new subdomain (e.g., `notebrowse.yourdomain.com`) pointing to your server's public IP.

---

## Step 1: Install Docker (if not installed)

If your existing server doesn't use Docker yet, install it. (If you already have Docker installed, skip this step).

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker --now
```

## Step 2: Clone the Repository

Clone your repository to the server. We recommend keeping distinct apps in `/opt/`.

```bash
sudo mkdir -p /opt/notebrowse
# Clone your code into the directory
# Replace with your actual repository URL:
sudo git clone https://github.com/arookiecoder-ip/NoteBrowse /opt/notebrowse

cd /opt/notebrowse
```

## Step 3: Configure Environment Variables

NoteBrowse requires secure cryptographic keys in production to encrypt notebooks at rest and sign session cookies.

Generate a highly-secure 32-byte encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Create exactly one `.env` file in the project root:
```bash
nano .env
```

Paste the following variables, replacing the key with your generated one:
```env
# Application Config
NODE_ENV=production

# Database config (matches docker-compose.yml)
DATABASE_URL=postgresql://notebrowse_user:notebrowse_pass@db:5432/notebrowse?schema=public

# High-Security Application Secrets
# PASTE YOUR GENERATED 32-BYTE BASE64 KEY HERE:
NOTEBOOK_ENCRYPTION_KEY=YOUR_GENERATED_KEY_HERE
```
*(Save and exit using `Ctrl+X` -> `Y` -> `Enter`)*

## Step 4: Start the Docker Containers

Let Docker build your Next.js application and start the PostgreSQL database. **Note:** NoteBrowse uses port `3000` by default. If your other website already uses port `3000`, edit `docker-compose.yml` to map a different external port (e.g., `3001:3000`).

```bash
sudo docker compose up -d --build
```
Verify the NoteBrowse containers are active:
```bash
sudo docker ps
```

## Step 5: Add a new Nginx SUBDOMAIN Block

Since you already have Nginx running another website, we'll create a completely separate Nginx block specifically for your subdomain.

Create a new configuration block file for NoteBrowse:
```bash
sudo nano /etc/nginx/sites-available/notebrowse
```

Paste the following, modifying the `server_name` to match your new subdomain. *(If you changed the docker port in Step 4 due to a port conflict, make sure `proxy_pass http://localhost:YOUR_NEW_PORT;` matches)*:

```nginx
server {
    server_name notebrowse.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security: Forward true IP to NoteBrowse's rate-limiter
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the subdomain configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/notebrowse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
*(Your main website config is left entirely untouched during this process).*

## Step 6: Enable HTTPS for the Subdomain

Assuming you already use Certbot for your existing domain, run Certbot to append a certificate specifically for the new subdomain block:

```bash
sudo certbot --nginx -d notebrowse.yourdomain.com
```

Select your new subdomain, follow the prompts, and let Certbot automatically update your new Nginx server block to handle HTTPS.

---

### 🎉 Subdomain Deployment Complete
You can now access your application securely at `https://notebrowse.yourdomain.com` completely isolated from your other website! 

To view live backend logs at any time:
```bash
cd /opt/notebrowse
sudo docker compose logs -f app
```
