#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")"
cd $DIR
docker buildx build --progress=plain --load --platform linux/amd64 -t vdbg .
docker run --rm -it vdbg ls
docker run --rm -it -v "$DIR":/mytmp vdbg sh -c "cp *.vsix /mytmp"
sudo chown $USER:$USER *.vsix
while true; do
    read -p "Do you wish to publish this extension? " yn
    case $yn in
        [Yy]* )
            docker run --rm -it vdbg bash -c "vsce login vytools && vsce publish";
            break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

# docker run --rm -it vdbg bash -c "vsce login vytools && vsce publish --pre-release"