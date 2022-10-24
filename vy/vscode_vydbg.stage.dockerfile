FROM vytools_app_base
# RUN curl -fsSL https://code-server.dev/install.sh | sh

ENV DEBIAN_FRONTEND=noninteractive
RUN apt install -y apt-transport-https wget

RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
RUN install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
RUN sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
RUN rm -f packages.microsoft.gpg
RUN apt update && apt install -y code libxshmfence1 libglu1

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs git

RUN npm install -g yo generator-code

RUN useradd user
RUN mkdir -p /home/user
RUN chown -R user /home/user