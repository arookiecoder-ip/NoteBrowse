# NoteBrowse Production Deployment Guide

This guide covers deploying the NoteBrowse application to a Linux server (Ubuntu/Debian) using Docker Compose and setting up Nginx as a reverse proxy with an SSL certificate.

## Prerequisites
1. A Linux Server (Ubuntu 22.04/24.04 recommended).
2. A registered domain name (e.g., `notebrowse.yourdomain.com`).
3. An A-Record in your DNS provider pointing your domain to the server's public IP address.

---

## Step 1: Install Dependencies

SSH into your server and install Docker and Nginx.

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker --now

# Install Nginx and Certbot (for free SSL certificates)
sudo apt install nginx certbot python3-certbot-nginx -y
```

## Step 2: Transfer Your Code

Clone your repository or upload your files to the server. We recommend placing the code in `/opt/notebrowse`.

```bash
sudo mkdir -p /opt/notebrowse
# (Copy your files into this directory using git or scp)
cd /opt/notebrowse
```

## Step 3: Configure Environment Variables

NoteBrowse requires secure cryptographic keys in production to encrypt notebooks at rest and sign cookies.

Generate a unique 32-byte encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Create a `.env` file in the project root:
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

Let Docker build your Next.js application and initialize the PostgreSQL database.

```bash
sudo docker compose up -d --build
```
Verify the containers are running (you should see both `notebrowse-server` and `notebrowse-db`):
```bash
sudo docker ps
```

## Step 5: Configure Nginx Reverse Proxy

Now, we will configure Nginx to proxy web traffic from your domain into the Docker container running on port `3000`.

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/notebrowse
```

Paste the following configuration (replace `notebrowse.yourdomain.com` with your actual domain):
```nginx
server {
    server_name notebrowse.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Forward true IP to NoteBrowse rate-limiter
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/notebrowse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Enable HTTPS (Free SSL)

Use Certbot to automatically generate and install an SSL certificate for your domain.

```bash
sudo certbot --nginx -d notebrowse.yourdomain.com
```

Follow the interactive prompts. Certbot will automatically rewrite your Nginx configuration to enforce HTTPS.

---

### 🎉 Deployment Complete
You can now access your application securely at `https://notebrowse.yourdomain.com`. 

To view live backend logs at any time:
```bash
sudo docker compose logs -f app
```
