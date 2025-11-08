# Cloud-Native Observability: Deconstructing the GKE & Prometheus Lab

This document breaks down a Google Cloud lab focused on deploying a monitored application. It explains the "why" and "how" of each step, provides a deeper dive into Prometheus, and offers a complete guide to replicating the workflow locally using only open-source tools.

---

## 🔬 Part 1: Deconstructing the Lab (The "Why" and "How")

Let's break down each task and explain *why* you did it.

### Task 1: Create a Docker Repository
* **How:** You ran `gcloud artifacts repositories create...`, loaded a pre-built Docker image (`docker load`), tagged it (`docker tag ...`), and pushed it (`docker push ...`).
* **Why:**
    * Applications now run as **containers**. A **Docker image** is the blueprint for that container.
    * Just like you use GitHub to store your *code*, you need a **Container Registry** to store your *images*.
    * **Artifact Registry** is Google's private, managed registry.
    * The `docker tag` command is like an address label. You told Docker, "This local image needs to be sent to this specific destination in Artifact Registry."
    * `docker push` is you "mailing the package" to that address.

### Task 2: Setup a GKE Cluster
* **How:** You ran `gcloud beta container clusters create gmp-cluster ...` and then `gcloud container clusters get-credentials ...`.
* **Why:**
    * You need a system to *run* and *manage* your containers. This is what **Kubernetes** does.
    * **Google Kubernetes Engine (GKE)** is Google's *managed* Kubernetes service.
    * `get-credentials` configures your local `kubectl` (the command-line remote control for Kubernetes) to securely talk to your new GKE cluster.
    * The `--enable-managed-prometheus` flag told GKE to automatically set up Google's *managed version* of Prometheus, which is pre-configured to send data to Cloud Monitoring.

### Task 3 & 4: Deploy the Prometheus Service & Application
* **How:** You created a namespace (`kubectl create ns`), downloaded app configuration files (`.yaml`), edited one to point to your image, and then applied them (`kubectl apply ...`).
* **Why:**
    * **Namespace (`gmp-test`):** A virtual folder inside your cluster to keep your project organized.
    * **`flask_deployment.yaml`:** This file told Kubernetes, "I want to run my application. Please create copies (pods) using the image I pushed to Artifact Registry."
    * **`flask_service.yaml`:** A `deployment` is internal. A `service` exposes it to the outside world (by creating a public IP address).
    * **`/metrics` endpoint:** The application was "instrumented" to expose a web page at the `/metrics` path. This page shows its internal counters, which is how Prometheus gets data.
    * **`prom_deploy.yaml`:** This defined a `PodMonitoring` resource. This told the Managed Prometheus service, "Hey, please start scraping (visiting) the `/metrics` endpoint on any pods in the `gmp-test` namespace."
    * **The `timeout` command:** This generated web traffic so that the `flask_http_request_total` counter would actually go up. No traffic means no data to visualize.

### Task 5: Observe the App via Metrics
* **How:** You ran a large `gcloud monitoring dashboards create ...` command with a JSON configuration.
* **Why:**
    * Raw data is just a table of numbers. **Cloud Monitoring** is Google's dashboard and visualization tool.
    * That big JSON blob was **dashboard-as-code**. It defined a new dashboard, added a chart, and told that chart exactly what data to query (the `flask_http_request_total/counter` metric) and how to display it.

---

## 🔭 Part 2: A Deeper Look at Prometheus

You used Google's *managed* Prometheus, but it's important to understand what the **open-source** Prometheus is.

**Prometheus is an open-source monitoring and alerting toolkit.** It is the standard for monitoring in the Kubernetes world.



At its core, it has two main jobs:
1.  **Scraping:** It "pulls" metrics from configured targets (like your app's `/metrics` endpoint) at a regular interval.
2.  **Storing:** It stores this data in a high-performance **Time-Series Database (TSDB)**.

This **pull model** is key. Prometheus actively *pulls* data from your apps. Your apps don't need to know where Prometheus is; they just need to expose their metrics.

A full Prometheus setup usually includes:
* **Prometheus Server:** The main component that does the scraping and storing.
* **Exporters:** Helper programs that create a `/metrics` endpoint for apps that don't have one (like a database).
* **Alertmanager:** A separate component that handles sending alerts to Slack, PagerDuty, or email.

---

## 💻 Part 3: How to Do This Locally with Open-Source Tools

You can replicate this entire lab on your own machine for free by swapping the Google Cloud services for their open-source equivalents.

| Google Cloud Service (Managed) | Open-Source Equivalent (Local) |
| :--- | :--- |
| **Artifact Registry** | **Local Docker Daemon** (or **Harbor**) |
| **Google Kubernetes Engine (GKE)**| **Minikube** (or **Kind**, **Docker Desktop**) |
| **Google Managed Prometheus** | **Open-Source Prometheus** (installed via **Helm**) |
| **Cloud Monitoring** | **Grafana** (the standard dashboard for Prometheus) |

### Your Local Workflow Step-by-Step:

1.  **Install the Tools:**
    * Docker Desktop (or Docker Engine)
    * Minikube
    * kubectl
    * Helm (the package manager for Kubernetes)

2.  **Start Your Local Cluster:**
    ```bash
    minikube start --driver=docker
    ```

3.  **Load Your App Image:**
    * Load the `.tar` file into your local Docker: `docker load -i flask_telemetry.tar`.
    * Tag the image and load it into Minikube's internal Docker environment:
        ```bash
        # Tag the image you just loaded
        docker tag gcr.io/ops-demo-330920/flask_telemetry:61a2a7aabc7077ef474eb24f4b69faeab47deed9 flask-telemetry:local
        
        # Load the image into the minikube cluster
        minikube image load flask-telemetry:local
        ```

4.  **Install Prometheus & Grafana (The Easy Way):**
    * Use **Helm** to install the `kube-prometheus-stack`.
    ```bash
    # Add the community repository
    helm repo add prometheus-community [https://prometheus-community.github.io/helm-charts](https://prometheus-community.github.io/helm-charts)
    helm repo update

    # Install the stack in a new 'monitoring' namespace
    helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace
    ```
    This one command installs Prometheus, Grafana, and all necessary configurations.

5.  **Deploy Your Application:**
    * Get the `gmp_prom_setup` files from the lab.
    * Edit `flask_deployment.yaml` with `nano`:
        * Change the `image:` name to `flask-telemetry:local`.
        * Add `imagePullPolicy: IfNotPresent` (so it uses your local image).
    * Apply the files to your local cluster:
        ```bash
        kubectl create ns gmp-test
        kubectl -n gmp-test apply -f flask_deployment.yaml
        kubectl -n gmp-test apply -f flask_service.yaml
        ```

6.  **Tell Prometheus to Scrape Your App:**
    * The lab's `prom_deploy.yaml` **will not work**. That is a Google-specific object.
    * You must create a `ServiceMonitor` object instead. Create a new file named `flask_servicemonitor.yaml`:

    ```yaml
    apiVersion: [monitoring.coreos.com/v1](https://monitoring.coreos.com/v1)
    kind: ServiceMonitor
    metadata:
      name: flask-telemetry-monitor
      namespace: gmp-test # Put this in the same namespace as your app
      labels:
        release: prometheus # This label tells the Helm chart to find it
    spec:
      namespaceSelector:
        matchNames:
        - gmp-test # Tell it to look in this namespace
      selector:
        matchLabels:
          app: flask-telemetry # Find the service with this label
      endpoints:
      - port: http # The name of the port in your flask_service.yaml
        interval: 15s
    ```
    * **Crucial:** Make sure the `matchLabels` value (`app: flask-telemetry`) matches the `selector` label in your `flask_service.yaml`.
    * Apply the new file:
        ```bash
        kubectl -n gmp-test apply -f flask_servicemonitor.yaml
        ```

7.  **Visualize in Grafana:**
    * Forward the Grafana port to your local machine:
        ```bash
        # Run this in a terminal; it will not exit
        kubectl -n monitoring port-forward svc/prometheus-grafana 3000:80
        ```
    * Open your browser to `http://localhost:3000`.
    * Log in. The username is `admin`. Get the password by running:
        ```bash
        kubectl -n monitoring get secret prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
        ```
    * Once logged in, go to the **Explore** tab. In the "Metrics browser" dropdown, you can now find and graph `flask_http_request_total`!
