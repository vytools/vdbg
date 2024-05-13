FROM node:18-buster
# RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN npm install -g @vscode/vsce
COPY workspace /workspace
WORKDIR /workspace
# RUN npm install
RUN vsce package 
RUN npm -v
#VY context .. 
#VY source node:18-buster
# docker run -it --rm vy__vdbg_build /bin/bash -c "vsce login vytools && vsce publish"