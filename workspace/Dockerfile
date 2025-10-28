FROM node:lts-jod
RUN npm install -g @vscode/vsce
COPY . /workspace
WORKDIR /workspace
RUN rm package-lock.json && npm install
RUN npm run esbuild-prod && vsce package 
RUN npm -v
# RUN vsce package --pre-release
