# 🧩 Microservices Architecture with Docker, NGINX, and Consul

> A hands-on practical exploration of how real-world microservice architectures work — containerized, networked, and discoverable, right from your local machine.  
> _“Not just running containers — we’re orchestrating services.”_

---

## 🚀 Project Overview

This project demonstrates a **microservices-based architecture** built using:
- 🐳 **Docker & Docker Compose** – to containerize and network multiple services  
- 🌐 **NGINX** – acting as an **API Gateway / Reverse Proxy**
- 🧭 **Consul** – for **service discovery** and network visibility  
- ⚙️ **Node.js (Express)** – for lightweight service logic

You’ll see how containers talk, how routing happens internally, and how DNS and reverse proxying keep everything seamless.

---

## 🧱 Architecture Diagram

            ┌────────────────────────────┐
            │        NGINX Gateway        │
            │ (Reverse Proxy / API Router)│
            │        :80 (localhost)      │
            └─────────────┬───────────────┘
                          │
 ┌────────────────────────┼────────────────────────┐
 │                        │                        │
┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│ User Service │ │ Product Svc │ │ Consul UI │
│ :5001 │ │ :5002 │ │ :8500 │
└──────────────┘ └──────────────┘ └────────────────┘
▲ ▲ ▲
│ │ │
└─────────────── Docker Virtual Network ───────┘

---

## 🧩 Services Overview

| Service | Role | Port | Description |
|----------|------|------|-------------|
| **gateway** | API Gateway (NGINX) | 80 | Forwards `/users` and `/products` requests |
| **user-service** | Express.js microservice | 5001 | Handles user data |
| **product-service** | Express.js microservice | 5002 | Handles product data |
| **consul** | Service Discovery | 8500 | Displays networked services |

---

## 🧠 What Happens When You Run `docker compose up`

When you bring the stack up, **Docker Compose orchestrates** everything like a small-scale Kubernetes cluster.  

### Step-by-Step:
1. 🐳 **Creates a bridge network** (here called `app-network`)  
   → Think of it as a private LAN just for containers.

2. 🏗️ **Builds all services** (each with its own `Dockerfile`).

3. 🌍 **Starts containers** and gives each one:
   - Its own IP address
   - A hostname identical to its Compose service name  
     (e.g., `user-service`, `product-service`, `consul`, `gateway`)

4. 🧭 **Consul** comes online at [http://localhost:8500](http://localhost:8500)
   - It provides a UI showing services and their health (can be integrated for automatic discovery later).

5. 🌐 **NGINX Gateway** starts listening on port **80**.
   - It receives all HTTP traffic and routes it internally to the right container.

---

## 🔍 Inside NGINX (Reverse Proxy Magic)

The `gateway/nginx.conf` defines how traffic is routed:

```nginx
events {}

http {
    server {
        listen 80;

        location /users {
            proxy_pass http://user-service:5001/users;
        }

        location /products {
            proxy_pass http://product-service:5002/products;
        }
    }
}