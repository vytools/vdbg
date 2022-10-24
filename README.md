# vdbg

couldnt get any of the docker stuff to work, finally just installed node etc locally

sudo apt install nodejs npm
cd into the workspace folder and run
npm install
<!-- sudo npm install -g yo generator-code -->

# Built a docker image to publish
DOCKER_BUILDKIT=1 docker build --tag vsce "https://github.com/microsoft/vscode-vsce.git#main"
docker run --rm -it -v "$(pwd)":/workspace vsce publish