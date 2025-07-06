echo
echo "**************************************"
echo "* Install Modules *"
echo "**************************************"
echo

npm install --location=global firebase-tools@latest pnpm

cd ./functions
pnpm install

pnpm add @google-cloud/functions-framework

echo
echo "**************************************"
echo "* Set Global Variables *"
echo "**************************************"
echo

awk '{gsub(/<SERVICE_ACCOUNT>/,"'$2'")}1' .env > tmp.env && mv tmp.env .env
awk '{gsub(/<NODE_ENV>/,"'$3'")}1' .env > tmp.env && mv tmp.env .env
awk '{gsub(/<PROJECT_NUMBER>/,"'$4'")}1' .env > tmp.env && mv tmp.env .env

echo
echo "**************************************"
echo "* Deploy Firebase Functions *"
echo "**************************************"
echo

firebase deploy --only functions --project=${1} -f