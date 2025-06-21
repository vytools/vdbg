FROM node:lts-jod
RUN npm install -g @vscode/vsce
COPY . /workspace
WORKDIR /workspace
RUN ls -al
RUN npm install
RUN vsce package 
RUN npm -v
# RUN vsce package --pre-release
