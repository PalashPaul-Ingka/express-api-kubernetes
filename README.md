# Deploying a Node Express App to Google Cloud with Kubernetes

Develop Node Express App as per the requirement and test it localy as first step.

### Docker

Create Dockerfile and docker-compose.yml in your project. Docker builds images automatically by reading the instructions from a Dockerfile -- a text file that contains all commands, in order, needed to build a given image. A Dockerfile adheres to a specific format and set of instructions.

A Docker image consists of read-only layers each of which represents a Dockerfile instruction. The layers are stacked and each one is a delta of the changes from the previous layer.

Build the images and spin up the containers:

```sh
$ docker-compose up -d --build
```
Test it out at:

1. [http://localhost:3000](http://localhost:3000)

### Kubernetes

#### Google Cloud Platform (GCP)

Install the [Google Cloud SDK](https://cloud.google.com/sdk), run `gcloud init` to configure it, and then either pick an existing GCP project or create a new project to work with.

Set the project:

```sh
$ gcloud config set project <PROJECT_ID>
```

Install `kubectl`:

```sh
$ gcloud components install kubectl
```

#### Kubernetes Cluster

Create a cluster on [Kubernetes Engine](https://console.cloud.google.com/kubernetes):

```sh
$ gcloud container clusters create node-kubernetes --num-nodes=3 --zone europe-west1-b --machine-type n1-standard-2
```
Note: Here `node-kubernetes` is the name of the container clusters

Connect the `kubectl` client to the cluster:

```sh
$ gcloud container clusters get-credentials node-kubernetes --zone europe-west1-b
```
Note: Here `node-kubernetes` is the name of the container clusters

#### Docker

Build and push the image to the [Container Registry](https://cloud.google.com/container-registry/):

```sh
$ gcloud auth configure-docker
$ docker build -t gcr.io/<PROJECT_ID>/node-kubernetes:v0.0.1 .
$ docker push gcr.io/<PROJECT_ID>/node-kubernetes:v0.0.1
```
Example: 

```sh
$ docker build -t gcr.io/<PROJECT_ID>/node-kubernetes:v0.1.1 .
$ docker push gcr.io/<PROJECT_ID>/node-kubernetes:v0.1.1
```

Note: Here `node-kubernetes` is the name of the container clusters

#### Service Account

Create a service account and assign necessary roles for your service account to work with kubernetes
Save the account key as a Kubernetes Secret

#### Secrets

Create the secret:

```sh
$ kubectl create secret generic node-kubernetes-key --from-file=key.json=key.json
```
Note: Here `key.json` is the service account key

#### Node

Update the image name *kubernetes/node-deployment* and then create the deployment:

```sh
$ kubectl create -f ./kubernetes/node-deployment.yaml
```

What's happening here?

metadata
    The `name` field defines the deployment name - node
    `labels` define the labels for the deployment - name: node
spec
    `replicas` define the number of pods to run - 1
    `template`
        `metadata`
            `labels` indicate which labels should be assigned to the pod - app: node
        `spec`
            `containers` define the containers associated with each pod
            `restartPolicy` defines the restart policy - Always

So, this will spin up a single pod named node via the gcr.io/<PROJECT_ID>/node-kubernetes:v0.0.1 image that we just pushed up.

Create the service:

```sh
$ kubectl create -f ./kubernetes/node-service.yaml
```

Apply the migration and seed the database:

```sh
$ kubectl get pods
$ kubectl exec <POD_NAME> knex migrate:latest
$ kubectl exec <POD_NAME> knex seed:run
```

Grab the external IP:

```sh
$ kubectl get service node

NAME   TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)          AGE
node   LoadBalancer   10.59.251.5   34.78.42.250   3000:31411/TCP   16m
```

Test it out:

1. [http://EXTERNAL_IP:3000](http://EXTERNAL_IP:3000)

#### Update Docker Image to kubernetes

```sh
$ kubectl set image deployment/node node=gcr.io/<PROJECT_ID>/node-kubernetes:v0.1.1
```
Note: Here `node` is the name of metadata used in node-deployment.yaml and new image version

#### Restart kubernetes node

```sh
$ kubectl rollout restart deployment node
```
Note: Here `node` is the name of metadata used in node-deployment.yaml

#### Check logs of pods

First find the pods and then check logs by the pods name

```sh
$ kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
node-787c9b79d5-cv8c5   1/1     Running   0          45m

$ kubectl logs node-787c9b79d5-cv8c5
> node-kubernetes@0.0.1 start /usr/src
> nodemon src/server.js

?[33m[nodemon] 1.19.4?[39m
Listening on port: 3000
events.js:167
      throw er; // Unhandled 'error' event
```

#### Remove

Remove the resources once done:

```sh
$ kubectl delete -f ./kubernetes/node-service.yaml
$ kubectl delete -f ./kubernetes/node-deployment.yaml

$ gcloud container clusters delete node-kubernetes
$ gcloud compute disks delete pg-data-disk
$ gcloud container images delete gcr.io/<PROJECT_ID>/node-kubernetes:v0.0.1
```
Delete service account if it not used any where else.