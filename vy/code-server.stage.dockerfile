FROM node:18-buster
# RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN npm install -g @vscode/vsce
COPY workspace ./workspace/
WORKDIR ./workspace
RUN vsce package 
RUN npm -v
RUN ls -al
#VY context .. 
#VY source node:18-buster