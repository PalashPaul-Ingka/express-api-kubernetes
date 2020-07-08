gcloud config set project <PROJECT_ID>
export GOOGLE_APPLICATION_CREDENTIALS='./clientkey/ugc-dev.json'
docker build -t gcr.io/<PROJECT_ID>/node-kubernetes:v$1 .
docker push gcr.io/<PROJECT_ID>/node-kubernetes:v$1
kubectl set image deployment/node node=gcr.io/<PROJECT_ID>/node-kubernetes:v$1
