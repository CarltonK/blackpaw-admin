echo
echo "**********************************************"
echo "* Set backend project Id *"
echo "**********************************************"
echo

gcloud config set project $1
gcloud config set compute/region $2

echo
echo "**************************************"
echo "* Replace variables in .firebaserc file *"
echo "**************************************"
echo

awk '{gsub(/<PROJECT_ID>/,"'$1'")}1' /workspace/.firebaserc >/workspace/tmp.firebaserc && mv /workspace/tmp.firebaserc /workspace/.firebaserc